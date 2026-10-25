import re
import sys

def sql_escape(valor):
    """Escapa um valor string para SQL."""
    return valor.replace("'", "''")

def parse_copy_line(linha, colunas):
    """Converte uma linha do formato COPY (tab-separated) para valores SQL."""
    campos = linha.split('\t')
    valores = []
    for i, campo in enumerate(campos):
        campo = campo.strip()
        if campo == '\\N':
            valores.append('NULL')
        else:
            # Para colunas de tipo texto/uuid/timestamp/data, envolve em aspas
            # Para colunas numéricas (valor, dia_inicio_ciclo, dia_fim_ciclo, total_parcelas, parcela_atual, valor_original)
            # e booleanos (fixo, dividido), deixa como está se for numérico ou booleano
            coluna = colunas[i] if i < len(colunas) else ''

            # Colunas numéricas que não precisam de aspas
            colunas_numericas = {'valor', 'valor_original', 'dia_inicio_ciclo', 'dia_fim_ciclo', 'total_parcelas', 'parcela_atual'}
            # Colunas booleanas
            colunas_booleanas = {'fixo', 'dividido'}

            if coluna in colunas_numericas:
                # Valor numérico - se for vazio, NULL
                if campo == '':
                    valores.append('NULL')
                else:
                    valores.append(campo)
            elif coluna in colunas_booleanas:
                # Booleano: t/f -> true/false
                if campo == 't':
                    valores.append('TRUE')
                elif campo == 'f':
                    valores.append('FALSE')
                else:
                    valores.append(f"'{sql_escape(campo)}'")
            else:
                # Texto/UUID/data/timestamp - envolve em aspas
                valores.append(f"'{sql_escape(campo)}'")
    return ', '.join(valores)

def converter_arquivo(entrada, saida):
    with open(entrada, 'r', encoding='utf-8') as f:
        conteudo = f.read()

    # Encontrar blocos COPY
    # Padrão: COPY public.tabela (col1, col2, ...) FROM stdin;
    padrao_copy = r"COPY public\.(\w+)\s*\(([^)]*)\)\s+FROM stdin;\n(.*?)\n\\."
    blocos = re.findall(padrao_copy, conteudo, re.DOTALL)

    inserts = []

    for tabela, colunas_str, dados in blocos:
        colunas = [c.strip() for c in colunas_str.split(',')]
        linhas_dados = [l for l in dados.strip().split('\n') if l.strip()]

        for linha in linhas_dados:
            valores = parse_copy_line(linha, colunas)
            inserts.append(f"INSERT INTO public.{tabela} ({', '.join(colunas)}) VALUES ({valores});")

    # Ordenar por tabela na ordem recomendada: categorias, configuracoes_usuario, transacoes, ajustes_saldo
    ordem = {'categorias': 1, 'configuracoes_usuario': 2, 'transacoes': 3, 'ajustes_saldo': 4}
    inserts.sort(key=lambda x: ordem.get(x.split('public.')[1].split(' ')[0], 99))

    # Agrupar por tabela para comentários
    inserts_por_tabela = {}
    for insert in inserts:
        tabela = insert.split('public.')[1].split(' ')[0]
        if tabela not in inserts_por_tabela:
            inserts_por_tabela[tabela] = []
        inserts_por_tabela[tabela].append(insert)

    with open(saida, 'w', encoding='utf-8') as f:
        f.write("-- Dados convertidos de COPY para INSERT statements\n")
        f.write("-- Ordem: categorias, configuracoes_usuario, transacoes, ajustes_saldo\n\n")

        for tabela in ['categorias', 'configuracoes_usuario', 'transacoes', 'ajustes_saldo']:
            if tabela in inserts_por_tabela:
                f.write(f"-- ===== {tabela} ({len(inserts_por_tabela[tabela])} registros) =====\n")
                for insert in inserts_por_tabela[tabela]:
                    f.write(insert + '\n')
                f.write('\n')

    print(f"Convertido: {len(inserts)} INSERT statements escritos em {saida}")
    for t in ['categorias', 'configuracoes_usuario', 'transacoes', 'ajustes_saldo']:
        if t in inserts_por_tabela:
            print(f"  {t}: {len(inserts_por_tabela[t])} registros")

if __name__ == '__main__':
    converter_arquivo('dados_eua.sql', 'dados_eua_inserts.sql')
