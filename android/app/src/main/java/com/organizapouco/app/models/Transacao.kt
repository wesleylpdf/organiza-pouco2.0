package com.organizapouco.app.models

import kotlinx.serialization.Serializable

@Serializable
data class Transacao(
    val id: String? = null,
    val user_id: String = "",
    val valor: Double = 0.0,
    val data: String = "",
    val tipo: String = "saida",
    val categoria: String = "",
    val fixo: Boolean = false,
    val descricao: String = "",
    val ciclo_inicio: String = ""
)
