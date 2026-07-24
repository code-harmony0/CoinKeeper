package com.coinkeeper

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmsModule"
    }

    @ReactMethod
    fun getSmsMessages(limit: Int, promise: Promise) {
        try {
            val messages = WritableNativeArray()
            val contentResolver: ContentResolver = reactApplicationContext.contentResolver
            val uri: Uri = Uri.parse("content://sms/inbox")
            
            val projection = arrayOf("_id", "address", "date", "body", "type")
            val cursor: Cursor? = contentResolver.query(uri, projection, null, null, "date DESC LIMIT $limit")
            
            cursor?.use {
                if (it.moveToFirst()) {
                    do {
                        val messageMap = WritableNativeMap()
                        
                        val idIndex = it.getColumnIndex("_id")
                        val addressIndex = it.getColumnIndex("address")
                        val dateIndex = it.getColumnIndex("date")
                        val bodyIndex = it.getColumnIndex("body")
                        val typeIndex = it.getColumnIndex("type")
                        
                        if (idIndex != -1) messageMap.putString("id", it.getString(idIndex))
                        if (addressIndex != -1) messageMap.putString("address", it.getString(addressIndex))
                        if (dateIndex != -1) messageMap.putString("date", it.getString(dateIndex))
                        if (bodyIndex != -1) messageMap.putString("body", it.getString(bodyIndex))
                        if (typeIndex != -1) messageMap.putString("type", it.getString(typeIndex))
                        
                        messages.pushMap(messageMap)
                    } while (it.moveToNext())
                }
            }
            
            promise.resolve(messages)
        } catch (e: Exception) {
            promise.reject("SMS_ERROR", e.message)
        }
    }
}
