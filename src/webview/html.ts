import * as vscode from 'vscode';
import * as fs from 'fs';

interface ManifestChunk {
  file: string;
  css?: string[];
}

type Manifest = Record<string, ManifestChunk>;

function readManifest(extensionUri: vscode.Uri): Manifest {
  const manifestPath = vscode.Uri.joinPath(
    extensionUri,
    'dist',
    'webview',
    '.vite',
    'manifest.json',
  ).fsPath;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  } catch {
    throw new Error('ChurnLens: webview assets are missing. Run "pnpm run build" and reload.');
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function webviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  entry: string,
  body: string,
  options: { codicons?: boolean } = {},
): string {
  const root = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
  const chunk = readManifest(extensionUri)[entry];
  if (!chunk) {
    throw new Error(`ChurnLens: no webview bundle for "${entry}". Run "pnpm run build".`);
  }
  const nonce = getNonce();

  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(root, chunk.file)).toString();
  const links = (chunk.css ?? []).map((css) =>
    webview.asWebviewUri(vscode.Uri.joinPath(root, css)).toString(),
  );

  if (options.codicons) {
    links.push(
      webview
        .asWebviewUri(
          vscode.Uri.joinPath(
            extensionUri,
            'node_modules',
            '@vscode/codicons',
            'dist',
            'codicon.css',
          ),
        )
        .toString(),
    );
  }

  const styles = links.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n    ');

  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource}`,
    `font-src ${webview.cspSource}`,
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${styles}
    <title>ChurnLens</title>
  </head>
  <body>
    ${body}
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}
