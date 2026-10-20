package com.organizapouco.app.utils

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object CicloUtils {
    private val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val formatterBR = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    fun getCicloInicioParaData(data: LocalDate, diaCiclo: Int = 9): LocalDate {
        val dia = data.dayOfMonth
        return if (dia >= diaCiclo) {
            LocalDate.of(data.year, data.month, diaCiclo)
        } else {
            data.minusMonths(1).withDayOfMonth(diaCiclo)
        }
    }

    fun getCicloAtual(offset: Int = 0, diaCiclo: Int = 9): LocalDate {
        val hoje = LocalDate.now()
        val cicloAtual = getCicloInicioParaData(hoje, diaCiclo)
        return cicloAtual.plusMonths(offset.toLong())
    }

    fun formatarIntervaloCiclo(cicloInicio: LocalDate): String {
        val inicio = cicloInicio.format(formatterBR)
        val fim = cicloInicio.plusMonths(1).minusDays(1).format(formatterBR)
        return "$inicio - $fim"
    }

    fun getCicloInicioString(data: String): String {
        val d = LocalDate.parse(data, formatter)
        return getCicloInicioParaData(d).format(formatter)
    }
}
