package com.coinkeeper

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SecureScreenModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SecureScreenModule"
    }

    @ReactMethod
    fun enable() {
        currentActivity?.runOnUiThread {
            currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    @ReactMethod
    fun disable() {
        currentActivity?.runOnUiThread {
            currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
