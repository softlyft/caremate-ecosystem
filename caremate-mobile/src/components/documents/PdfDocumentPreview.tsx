import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import { palette } from '@/theme';

type Props = {
  /** Local cache URI from prepareLocalPreview (file://…). */
  uri: string;
  title: string;
  onLoadEnd: () => void;
  onError: (message?: string) => void;
};

/**
 * Android Chromium WebView cannot paint PDFs — it hands them to DownloadManager
 * (file lands in /Downloads, onLoadEnd never fires). Render with PDF.js from the
 * already-cached local file instead.
 */
export function PdfDocumentPreview({ uri, title, onLoadEnd, onError }: Props) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (cancelled) {
          return;
        }
        setHtml(buildPdfViewerHtml(base64));
      } catch (err) {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : undefined);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // onError/onLoadEnd are stable enough when parent uses useCallback; uri is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid reload loops from inline handlers
  }, [uri]);

  if (!html) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  return (
    <WebView
      allowFileAccess
      originWhitelist={['*']}
      setSupportMultipleWindows={false}
      style={styles.webView}
      source={{ html, baseUrl: 'https://localhost/' }}
      accessibilityLabel={title}
      onMessage={(event) => {
        try {
          const payload = JSON.parse(event.nativeEvent.data) as {
            type?: string;
            message?: string;
          };
          if (payload.type === 'ready') {
            onLoadEnd();
            return;
          }
          if (payload.type === 'error') {
            onError(payload.message);
          }
        } catch {
          onError();
        }
      }}
      onError={() => onError()}
      onHttpError={() => onError()}
    />
  );
}

function buildPdfViewerHtml(base64: string): string {
  // PDF bytes stay in the WebView; only the PDF.js library is loaded from CDN.
  const safeBase64 = base64.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #111827;
      color: #e5e7eb;
      font-family: -apple-system, system-ui, sans-serif;
    }
    #pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 12px 8px 24px;
      box-sizing: border-box;
    }
    canvas {
      max-width: 100%;
      height: auto;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
    #status {
      padding: 24px 16px;
      text-align: center;
      font-size: 14px;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="status">Loading PDF…</div>
  <div id="pages"></div>
  <script>
    (function () {
      function post(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function fail(message) {
        var status = document.getElementById('status');
        if (status) status.textContent = message || 'Could not render PDF';
        post({ type: 'error', message: message || 'Could not render PDF' });
      }

      if (typeof pdfjsLib === 'undefined') {
        fail('PDF viewer library failed to load');
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      try {
        var raw = atob('${safeBase64}');
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i);
        }

        pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
          var status = document.getElementById('status');
          if (status) status.remove();
          var pages = document.getElementById('pages');
          var scale = Math.min(2, (window.devicePixelRatio || 1) * 1.25);

          var renderPage = function (pageNum) {
            return pdf.getPage(pageNum).then(function (page) {
              var viewport = page.getViewport({ scale: scale });
              var canvas = document.createElement('canvas');
              var ctx = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              pages.appendChild(canvas);
              return page.render({ canvasContext: ctx, viewport: viewport }).promise;
            });
          };

          var chain = Promise.resolve();
          for (var n = 1; n <= pdf.numPages; n++) {
            (function (pageNum) {
              chain = chain.then(function () { return renderPage(pageNum); });
            })(n);
          }

          return chain.then(function () {
            post({ type: 'ready' });
          });
        }).catch(function (err) {
          fail(err && err.message ? err.message : String(err));
        });
      } catch (err) {
        fail(err && err.message ? err.message : String(err));
      }
    })();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
});
