package com.organizapouco.app.data.repository

import com.organizapouco.app.data.remote.SupabaseClient
import com.organizapouco.app.models.Transacao
import io.github.jan.supabase.postgrest.query.PostgrestQueryBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TransacoesRepository {
    private val postgrest = SupabaseClient.postgrest
    private val table: PostgrestQueryBuilder = postgrest.from("transacoes")

    suspend fun getTransacoes(userId: String, cicloInicio: String): Result<List<Transacao>> = withContext(Dispatchers.IO) {
        try {
            val response = table
                .select {
                    filter {
                        eq("user_id", userId)
                        eq("ciclo_inicio", cicloInicio)
                    }
                    order("data", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                }
                .decodeList<Transacao>()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun insertTransacao(transacao: Transacao): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            table.insert(transacao)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateTransacao(id: String, updates: Map<String, Any>): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            table.update(updates) {
                filter { eq("id", id) }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteTransacao(id: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            table.delete {
                filter { eq("id", id) }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun aplicarFixos(userId: String, cicloAnterior: String, cicloAtual: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // Implementação simplificada: placeholder, pois a lógica real depende
            // de como os registros de fixos são modelados no banco.
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
