package com.organizapouco.app.models

data class ResumoCiclo(
    val entradas: Double = 0.0,
    val saidas: Double = 0.0,
    val saldo: Double = 0.0
) {
    companion object {
        fun calcular(transacoes: List<Transacao>): ResumoCiclo {
            val entradas = transacoes
                .filter { it.tipo == "entrada" }
                .sumOf { it.valor }
            val saidas = transacoes
                .filter { it.tipo == "saida" }
                .sumOf { it.valor }
            return ResumoCiclo(entradas, saidas, entradas - saidas)
        }
    }
}
