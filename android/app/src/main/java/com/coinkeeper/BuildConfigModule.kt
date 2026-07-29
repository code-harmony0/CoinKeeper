package com.coinkeeper

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class BuildConfigModule(reactContext: ReactApplicationContext, private val includeChitFund: Boolean) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "BuildConfig"
    }

    override fun getConstants(): Map<String, Any> {
        val constants = HashMap<String, Any>()
        constants["INCLUDE_CHITFUND"] = includeChitFund
        return constants
    }
}
