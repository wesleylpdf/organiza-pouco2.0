package com.organizapouco.app.models

import kotlinx.serialization.Serializable

@Serializable
data class Categoria(
    val id: String? = null,
    val user_id: String = "",
    val nome: String = "",
    val icone: String = "sparkles",
    val cor: String = "#6B7280"
)
