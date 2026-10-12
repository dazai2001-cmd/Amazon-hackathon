package dev.moveroom.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.net.Uri;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.widget.EditText;
import java.net.URI;
import org.json.JSONObject;

/** Fire OS/Android TV host. Camera tracking runs on the paired phone. */
public class MainActivity extends Activity {
    private WebView web;
    private String serverUrl;
    private boolean menuSetupShown = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        web = new WebView(this);
        web.setBackgroundColor(0xff111612);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setUseWideViewPort(true);
        web.getSettings().setLoadWithOverviewMode(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Keep navigation inside the configured application origin.
                try { return !new URI(serverUrl).getAuthority().equals(request.getUrl().getAuthority()); }
                catch (Exception ignored) { return true; }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) runOnUiThread(() -> showServerDialog("Start the MoveRoom server on your computer, then enter its address. The Android emulator uses http://10.0.2.2:8787."));
            }
        });
        setContentView(web);
        String requested = getIntent().getStringExtra("server");
        serverUrl = requested != null ? requested : getPreferences(MODE_PRIVATE).getString("server", "http://10.0.2.2:8787");
        loadServer(serverUrl);
        web.requestFocus();
    }

    private void loadServer(String url) {
        try {
            URI uri = new URI(url);
            if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null) throw new Exception();
            serverUrl = url.replaceAll("/+$", "");
            getPreferences(MODE_PRIVATE).edit().putString("server", serverUrl).apply();
            web.loadUrl(Uri.parse(serverUrl).buildUpon().appendQueryParameter("platform", "firetv").build().toString());
        } catch (Exception error) { showServerDialog("Enter a valid http:// or https:// server address."); }
    }

    private void showServerDialog(String message) {
        EditText input = new EditText(this);
        input.setText(serverUrl); input.setSingleLine(true); input.setSelectAllOnFocus(true);
        new AlertDialog.Builder(this).setTitle("Connect MoveRoom").setMessage(message).setView(input)
            .setPositiveButton("Connect", (dialog, which) -> loadServer(input.getText().toString().trim()))
            .setNegativeButton("Cancel", null).show();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        // Footwork needs a real key-up, including when WebView consumes D-pad
        // events. Forward both halves of remote presses through the same route.
        String movementKey = null;
        switch (event.getKeyCode()) {
            case KeyEvent.KEYCODE_DPAD_LEFT: movementKey = "ArrowLeft"; break;
            case KeyEvent.KEYCODE_DPAD_RIGHT: movementKey = "ArrowRight"; break;
            case KeyEvent.KEYCODE_DPAD_UP: movementKey = "ArrowUp"; break;
            case KeyEvent.KEYCODE_DPAD_DOWN: movementKey = "ArrowDown"; break;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: movementKey = "Enter"; break;
        }
        if (movementKey != null && (event.getAction() == KeyEvent.ACTION_DOWN || event.getAction() == KeyEvent.ACTION_UP)) {
            String type = event.getAction() == KeyEvent.ACTION_DOWN ? "keydown" : "keyup";
            forwardKey(type, movementKey, event.getRepeatCount() > 0, false);
            return true;
        }
        // WebView can consume media keys before Activity.onKeyDown sees them.
        if (event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || event.getKeyCode() == KeyEvent.KEYCODE_MENU) {
            if (event.getKeyCode() == KeyEvent.KEYCODE_MENU && event.getAction() == KeyEvent.ACTION_UP) menuSetupShown = false;
            if (event.getKeyCode() == KeyEvent.KEYCODE_MENU && event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) menuSetupShown = false;
            if (event.getKeyCode() == KeyEvent.KEYCODE_MENU && event.getAction() == KeyEvent.ACTION_DOWN && !menuSetupShown && (event.isLongPress() || event.getRepeatCount() >= 3) && BuildConfig.DEBUG) {
                menuSetupShown = true;
                showServerDialog("Enter the address of your MoveRoom server.");
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                forwardKey("keydown", " ", false, false);
            }
            return true;
        }
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                forwardKey("keydown", "Escape", false, true);
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void forwardKey(String type, String key, boolean repeat, boolean exitIfUnhandled) {
        // Target the focused DOM control so React inputs and sliders receive
        // Select and arrows. The event still bubbles to the game controller.
        String script = "(document.activeElement||document.body||window).dispatchEvent(new KeyboardEvent("
            + JSONObject.quote(type) + ",{key:" + JSONObject.quote(key)
            + ",bubbles:true,cancelable:true,repeat:" + repeat + "}))";
        web.evaluateJavascript(script, result -> {
            // Back first closes the game's current menu. Only an unhandled
            // Back at the main menu exits; quick nested Back presses are safe.
            if (exitIfUnhandled && "true".equals(result)) runOnUiThread(() -> finish());
        });
    }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
