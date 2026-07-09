/**
 * Bungalow Resepsiyonist — Web Widget Embed Script
 * 
 * Usage:
 *   <script src="https://panel.merman.sbs/widget.js"
 *     data-primary="#0f766e"
 *     data-business-name="Merman Bungalov"
 *     data-whatsapp-number="905427450654"
 *     data-greeting="Merhaba! Size nasıl yardımcı olabilirim?"
 *     defer></script>
 * 
 * Or programmatically:
 *   BungalowWidget.init({
 *     primary: '#0f766e',
 *     businessName: 'Merman Bungalov',
 *     whatsappNumber: '905427450654',
 *   });
 */
(function () {
  'use strict';

  var WIDGET_NS = 'BungalowWidget';

  // ─── Defaults ──────────────────────────────────────────────────────────────

  var DEFAULTS = {
    primary: '#0f766e',
    position: 'right',
    greeting: 'Merhaba! Size nasıl yardımcı olabilirim?',
    placeholder: 'Mesajınızı yazın...',
    theme: 'auto',
    logo: '',
    businessName: 'İşletme',
    whatsappNumber: '905427450654',
    whatsappMessage: 'Merhaba, rezervasyon hakkında bilgi almak istiyorum.',
  };

  // ─── Parse data attributes ─────────────────────────────────────────────────

  function parseDataAttributes(scriptEl) {
    var attrs = scriptEl ? scriptEl.dataset : {};
    var cfg = {};

    if (attrs.primary) cfg.primary = attrs.primary;
    if (attrs.position === 'left' || attrs.position === 'right') cfg.position = attrs.position;
    if (attrs.greeting) cfg.greeting = attrs.greeting;
    if (attrs.placeholder) cfg.placeholder = attrs.placeholder;
    if (attrs.theme === 'light' || attrs.theme === 'dark' || attrs.theme === 'auto')
      cfg.theme = attrs.theme;
    if (attrs.logo) cfg.logo = attrs.logo;
    if (attrs.businessName) cfg.businessName = attrs.businessName;
    if (attrs.whatsappNumber) cfg.whatsappNumber = attrs.whatsappNumber;
    if (attrs.whatsappMessage) cfg.whatsappMessage = attrs.whatsappMessage;

    return cfg;
  }

  // ─── Build iframe URL ──────────────────────────────────────────────────────

  function buildIframeUrl(baseUrl, config) {
    var params = new URLSearchParams();
    if (config.primary && config.primary !== DEFAULTS.primary) params.set('primary', config.primary);
    if (config.position && config.position !== DEFAULTS.position) params.set('position', config.position);
    if (config.greeting && config.greeting !== DEFAULTS.greeting) params.set('greeting', config.greeting);
    if (config.placeholder && config.placeholder !== DEFAULTS.placeholder) params.set('placeholder', config.placeholder);
    if (config.theme && config.theme !== DEFAULTS.theme) params.set('theme', config.theme);
    if (config.logo) params.set('logo', config.logo);
    if (config.businessName && config.businessName !== DEFAULTS.businessName) params.set('businessName', config.businessName);
    if (config.whatsappNumber && config.whatsappNumber !== DEFAULTS.whatsappNumber) params.set('whatsappNumber', config.whatsappNumber);
    if (config.whatsappMessage && config.whatsappMessage !== DEFAULTS.whatsappMessage) params.set('whatsappMessage', config.whatsappMessage);

    var qs = params.toString();
    return baseUrl + (qs ? '?' + qs : '');
  }

  // ─── Inject widget into the page ───────────────────────────────────────────

  function injectWidget(config) {
    // Prevent double injection
    if (document.getElementById('bungalow-widget-iframe')) return;

    // Resolve base URL: try data-base attribute, then script src origin
    var scriptEl = document.querySelector('script[data-widget-src]');
    var baseUrl = config.baseUrl || (scriptEl ? scriptEl.getAttribute('data-base') : '');

    if (!baseUrl) {
      // Derive from current script's src (handles both relative and absolute)
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        if (src.indexOf('/widget.js') !== -1 || src.indexOf('/widget.min.js') !== -1) {
          baseUrl = src.substring(0, src.lastIndexOf('/')) + '/widget';
          break;
        }
      }
    }

    // Fallback: use the page origin
    if (!baseUrl) {
      baseUrl = window.location.origin + '/widget';
    }

    var iframeUrl = buildIframeUrl(baseUrl, config);

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.id = 'bungalow-widget-iframe';
    iframe.src = iframeUrl;
    iframe.style.cssText =
      'position:fixed;bottom:0;right:0;width:100%;height:100%;' +
      'max-width:420px;max-height:640px;border:none;' +
      'z-index:2147483646;pointer-events:none;' +
      'background:transparent;overflow:hidden;';
    iframe.title = 'Sohbet';
    iframe.setAttribute('aria-label', 'Sohbet penceresi');
    iframe.setAttribute('loading', 'lazy');

    // Append
    document.body.appendChild(iframe);
  }

  // ─── Init function (exposed on window) ─────────────────────────────────────

  function init(userConfig) {
    var scriptEl = document.currentScript ||
      document.querySelector('script[src*="widget.js"]');

    var config = {};
    // Merge: defaults ← data attributes ← userConfig
    for (var k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) config[k] = DEFAULTS[k];
    var dataCfg = parseDataAttributes(scriptEl);
    for (var k in dataCfg) if (dataCfg.hasOwnProperty(k)) config[k] = dataCfg[k];
    if (userConfig) {
      for (var k in userConfig) if (userConfig.hasOwnProperty(k)) config[k] = userConfig[k];
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { injectWidget(config); });
    } else {
      injectWidget(config);
    }
  }

  // ─── Auto-init on script load ──────────────────────────────────────────────

  // For <script defer> or <script> at bottom of body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Only auto-init if there's no explicit BungalowWidget.init() call
      // We check a flag so double init doesn't happen
      if (!window.__bungalowWidgetInitCalled) {
        init();
      }
    });
  } else {
    // Script loaded after DOM is ready (e.g., async)
    if (!window.__bungalowWidgetInitCalled) {
      init();
    }
  }

  // ─── Export API ────────────────────────────────────────────────────────────

  window[WIDGET_NS] = {
    init: function (cfg) {
      window.__bungalowWidgetInitCalled = true;
      init(cfg);
    },
  };

})();
