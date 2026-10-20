package com.organizapouco.app.utils

import com.organizapouco.app.models.Transacao
import java.time.LocalDate

object ValidationUtils {
    data class ErrosValidacao(
        val valor: String? = null,
        val data: String? = null,
        val categoria: String? = null,
        val descricao: String? = null,
        val tipo: String? = null
    ) {
        fun temErro(): Boolean = valor != null || data != null || categoria != null || descricao != null || tipo != null
    }

    fun validarTransacao(t: Transacao): ErrosValidacao {
        var valor: String? = null
        var data: String? = null
        var categoria: String? = null
        var descricao: String? = null
        var tipo: String? = null

        if (t.valor <= 0) valor = "Valor deve ser maior que zero"
        if (t.valor > 999999999999.99) valor = "Valor máximo excedido"

        try {
            LocalDate.parse(t.data)
        } catch (e: Exception) {
            data = "Data inválida (use YYYY-MM-DD)"
        }

        if (t.categoria.length > 50) categoria = "Categoria muito longa"
        if (t.descricao.length > 100) descricao = "Descrição muito longa"
        if (t.tipo !in listOf("entrada", "saida")) tipo = "Tipo inválido"

        return ErrosValidacao(valor, data, categoria, descricao, tipo)
    }

    fun mapearErroAuth(message: String): String = when {
        message.contains("Invalid login") -> "E-mail ou senha inválidos"
        message.contains("Email not confirmed") -> "Confirme seu e-mail primeiro"
        message.contains("User already registered") -> "Este e-mail já está cadastrado"
        message.contains("Password") -> "Senha deve ter pelo menos 6 caracteres"
        else -> message
    }
}
