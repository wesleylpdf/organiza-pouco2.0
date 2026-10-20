package com.organizapouco.app.data.repository

import com.organizapouco.app.data.remote.SupabaseClient
import com.organizapouco.app.models.Categoria
import com.organizapouco.app.models.Transacao
import io.github.jan.supabase.postgrest.query.PostgrestQueryBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CategoriasRepository {
    private val postgrest = SupabaseClient.postgrest
    private val table: PostgrestQueryBuilder = postgrest.from("categorias")
    private val transacoesTable: PostgrestQueryBuilder = postgrest.from("transacoes")

    suspend fun getCategorias(userId: String): Result<List<Categoria>> = withContext(Dispatchers.IO) {
        try {
            val response = table
                .select {
                    filter { eq("user_id", userId) }
                    order("nome", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
                }
                .decodeList<Categoria>()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun insertCategoria(categoria: Categoria): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            table.insert(categoria)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateCategoria(id: String, nomeAntigo: String, nomeNovo: String, updates: Map<String, Any>): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            table.update(updates) {
                filter { eq("id", id) }
            }
            if (nomeAntigo != nomeNovo) {
                transacoesTable.update(mapOf("categoria" to nomeNovo)) {
                    filter { eq("categoria", nomeAntigo) }
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteCategoria(id: String, nome: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val rows = transacoesTable
                .select { filter { eq("categoria", nome) } }
                .decodeList<Transacao>()
            val count = rows.size

            if (count > 0) {
                throw Exception("Não é possível excluir: categoria em uso")
            }
            table.delete {
                filter { eq("id", id) }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
