package com.organizapouco.app

import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

private const val WEB_URL = "https://wesleylpdf.github.io/organiza-pouco2.0/"

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this).apply {
            layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                loadWithOverviewMode = true
                useWideViewPort = true
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false

                // Permite que o JavaScript abra novas janelas automaticamente
                javaScriptCanOpenWindowsAutomatically = true
            }

            // O WebChromeClient é essencial para fazer alertas e pop-ups do site funcionarem nativamente
            webChromeClient = WebChromeClient()

            // Mantém a navegação dentro do app e força links de "nova aba" a abrirem na mesma tela
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    view?.loadUrl(request?.url.toString())
                    return true
                }
            }
        }

        setContentView(webView)
        webView.loadUrl(WEB_URL)
    }
}