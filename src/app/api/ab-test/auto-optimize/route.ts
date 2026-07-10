import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function serverError(msg: string) {
  console.error("auto-optimize error:", msg);
  return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
}

/**
 * Validate CRON_SECRET from Authorization header.
 * Supports both "Bearer XXX" and raw token.
 */
function validateCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedSecret =
    process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;

  if (!expectedSecret) {
    return false;
  }

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  return !!token && token === expectedSecret;
}

// ─── GET /api/ab-test/auto-optimize ──────────────────────────────────────────
// Manual optimization for a specific test.
// Query params: test_id (required), tenant_id (optional, defaults to merman)
//
// Returns the optimization result including winner info.

export async function GET(request: NextRequest) {
  try {
    if (!validateCronSecret(request)) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("test_id");
    const tenantId =
      searchParams.get("tenant_id") ||
      "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999";

    if (!testId) {
      return NextResponse.json(
        { error: "test_id parametresi zorunludur" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check test exists and belongs to tenant
    const { data: test, error: testError } = await supabase
      .from("ab_tests")
      .select("id, name, target_metric, is_active")
      .eq("id", testId)
      .eq("tenant_id", tenantId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: "Test bulunamadı" },
        { status: 404 }
      );
    }

    // Run the auto-optimize function
    const { data: optId, error: rpcError } = await supabase.rpc(
      "auto_optimize_ab_test",
      {
        p_test_id: testId,
        p_tenant_id: tenantId,
        p_triggered_by: "manual",
        p_min_sample_size: 30,
      }
    );

    if (rpcError) {
      return serverError(`Optimizasyon hatası: ${rpcError.message}`);
    }

    // Fetch the optimization record
    const { data: optimization } = await supabase
      .from("ab_test_optimizations")
      .select(
        `
        id,
        status,
        sample_size,
        confidence_score,
        winner_variant_id,
        applied_at,
        created_at
      `
      )
      .eq("id", optId)
      .single();

    // Fetch winner variant name if exists
    let winnerVariantName = null;
    if (optimization?.winner_variant_id) {
      const { data: variant } = await supabase
        .from("ab_test_variants")
        .select("name, label")
        .eq("id", optimization.winner_variant_id)
        .single();
      winnerVariantName = variant?.label || variant?.name || null;
    }

    return NextResponse.json({
      success: true,
      test_id: testId,
      test_name: test.name,
      optimization,
      winner_variant_name: winnerVariantName,
    });
  } catch (err) {
    return serverError(
      err instanceof Error ? err.message : "Bilinmeyen hata"
    );
  }
}

// ─── POST /api/ab-test/auto-optimize ─────────────────────────────────────────
// Cron-based: auto-optimize all active tests that have enough data.
// Triggered by external cron (n8n or Coolify) with CRON_SECRET.
//
// Returns summary of all optimizations performed.

export async function POST(request: NextRequest) {
  try {
    if (!validateCronSecret(request)) {
      return unauthorized();
    }

    const supabase = createAdminClient();

    // Find all active tests
    const { data: activeTests, error: listError } = await supabase
      .from("ab_tests")
      .select("id, tenant_id, name, target_metric")
      .eq("is_active", true)
      .limit(50);

    if (listError) {
      return serverError(`Test listesi hatası: ${listError.message}`);
    }

    if (!activeTests?.length) {
      return NextResponse.json({
        success: true,
        message: "Aktif A/B testi bulunamadı",
        optimizations: [],
      });
    }

    const results: Array<{
      test_id: string;
      test_name: string;
      status: string;
      sample_size: number;
      winner_variant_id: string | null;
      message: string;
    }> = [];

    for (const test of activeTests) {
      try {
        const { data: optId, error: rpcError } = await supabase.rpc(
          "auto_optimize_ab_test",
          {
            p_test_id: test.id,
            p_tenant_id: test.tenant_id,
            p_triggered_by: "cron",
            p_min_sample_size: 30,
          }
        );

        if (rpcError) {
          results.push({
            test_id: test.id,
            test_name: test.name,
            status: "failed",
            sample_size: 0,
            winner_variant_id: null,
            message: rpcError.message,
          });
          continue;
        }

        const { data: opt } = await supabase
          .from("ab_test_optimizations")
          .select("id, status, sample_size, winner_variant_id")
          .eq("id", optId)
          .single();

        results.push({
          test_id: test.id,
          test_name: test.name,
          status: opt?.status ?? "unknown",
          sample_size: opt?.sample_size ?? 0,
          winner_variant_id: opt?.winner_variant_id ?? null,
          message:
            opt?.status === "completed"
              ? "Kazanan varyant belirlendi ve uygulandı"
              : opt?.status === "pending"
                ? "Yetersiz veri, beklemeye alındı"
                : "İşlem başarısız",
        });
      } catch (innerErr) {
        results.push({
          test_id: test.id,
          test_name: test.name,
          status: "failed",
          sample_size: 0,
          winner_variant_id: null,
          message:
            innerErr instanceof Error
              ? innerErr.message
              : "Bilinmeyen hata",
        });
      }
    }

    const completedCount = results.filter(
      (r) => r.status === "completed"
    ).length;
    const pendingCount = results.filter(
      (r) => r.status === "pending"
    ).length;
    const failedCount = results.filter(
      (r) => r.status === "failed"
    ).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        completed: completedCount,
        pending: pendingCount,
        failed: failedCount,
      },
      optimizations: results,
    });
  } catch (err) {
    return serverError(
      err instanceof Error ? err.message : "Bilinmeyen hata"
    );
  }
}
