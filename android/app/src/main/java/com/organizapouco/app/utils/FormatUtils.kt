package com.organizapouco.app.utils

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.text.NumberFormat
import java.util.Locale

object FormatUtils {
    private val formatterISO = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val formatterBR = DateTimeFormatter.ofPattern("dd/MM/yyyy")
    private val currency = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))

    fun formatarMoeda(valor: Double): String = currency.format(valor)

    fun formatarData(data: String): String {
        return try {
            LocalDate.parse(data, formatterISO).format(formatterBR)
        } catch (e: Exception) {
            data
        }
    }

    fun sanitizarHTML(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
    }
}
