# Organiza Pouco Android

Aplicativo Android nativo baseado no projeto web Organiza Pouco v2.0.

## 🛠️ Tecnologias

- **Linguagem**: Kotlin
- **UI**: Jetpack Compose
- **Backend**: Supabase (mesmo do web)
- **Gráficos**: MPAndroidChart
- **Arquitetura**: MVVM + Repository Pattern

## 📋 Pré-requisitos

- Android Studio Hedgehog (2023.1.1) ou superior
- JDK 17
- Android SDK 34
- Dispositivo Android (emulador ou físico) com API 26+ (Android 8.0+)

## 🚀 Como Abrir no Android Studio

### 1. Abra o Android Studio

### 2. Importe o projeto
- **File** → **Open**
- Navegue até: `D:\openclaude\organiza-pouco\android`
- Selecione a pasta `android` e clique em **OK**

### 3. Sincronize o Gradle
- Aguarde o Android Studio baixar as dependências
- Se aparecer um aviso sobre Gradle, clique em **"Sync Now"**

### 4. Configure o dispositivo
- Conecte um dispositivo Android via USB com depuração USB ativada
- OU crie um emulador: **Tools** → **Device Manager** → **Create Device**

### 5. Execute o app
- Clique no botão verde **▶ Run** (ou pressione Shift+F10)
- Selecione o dispositivo de destino

## 🔧 Configurar Supabase

As credenciais do Supabase já estão configuradas em `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "SUPABASE_URL", "\"https://bqhtemwakomvfhkjmzqs.supabase.co\"")
buildConfigField("String", "SUPABASE_ANON_KEY", "\"sb_publishable_4UfOScDU3DiJ4vyPrAKakg_1xmw4Qcp\"")
```

Se precisar alterar, edite essas linhas no arquivo `app/build.gradle.kts`.

## 📦 Gerar APK

### APK de Debug (para testes)
```bash
./gradlew assembleDebug
```
O APK será gerado em: `app/build/outputs/apk/debug/app-debug.apk`

### APK de Release (assinado)
1. Crie uma keystore:
```bash
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias meu-alias
```

2. Adicione em `app/build.gradle.kts`:
```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("release-key.jks")
            storePassword = "sua-senha"
            keyAlias = "meu-alias"
            keyPassword = "sua-senha"
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // ... resto da config
        }
    }
}
```

3. Gere o APK:
```bash
./gradlew assembleRelease
```

O APK será gerado em: `app/build/outputs/apk/release/app-release.apk`

### Via Android Studio
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Aguarde o build terminar
3. Clique em **locate** para abrir a pasta do APK

## 📱 Funcionalidades Implementadas

✅ Autenticação (login/cadastro/reset senha)
✅ CRUD de transações (criar/editar/excluir)
✅ CRUD de categorias (criar/editar/excluir)
✅ Navegação entre ciclos financeiros
✅ Filtro de transações fixas
✅ Aplicar transações fixas do ciclo anterior
✅ Resumo do ciclo (entradas/saídas/saldo)
✅ Formatação de moeda brasileira
✅ Tema claro/escuro (automático do sistema)

## 🎨 Estrutura do Código

```
app/src/main/java/com/organizapouco/app/
├── models/              # Data classes
│   ├── Transacao.kt
│   ├── Categoria.kt
│   └── ResumoCiclo.kt
├── data/
│   ├── remote/
│   │   └── SupabaseClient.kt    # Configuração Supabase
│   └── repository/
│       ├── TransacoesRepository.kt
│       └── CategoriasRepository.kt
├── ui/
│   ├── screens/
│   │   ├── AuthViewModel.kt     # Lógica de autenticação
│   │   ├── AuthScreen.kt        # Tela de login/cadastro
│   │   ├── DashboardViewModel.kt # Lógica do dashboard
│   │   ├── DashboardScreen.kt   # Tela principal
│   │   ├── TransacaoDialog.kt   # Formulário de transação
│   │   └── CategoriasDialog.kt  # Gerenciamento de categorias
│   └── theme/
│       └── Theme.kt             # Tema Material 3
├── utils/
│   ├── CicloUtils.kt            # Cálculos de ciclo financeiro
│   ├── FormatUtils.kt           # Formatação de moeda/data
│   └── ValidationUtils.kt       # Validações
└── MainActivity.kt              # Entry point
```

## 🐛 Troubleshooting

### Erro: "Gradle sync failed"
- Verifique se tem internet para baixar dependências
- **File** → **Invalidate Caches / Restart**

### Erro: "SDK location not found"
- Configure o SDK em **File** → **Project Structure** → **SDK Location**
- Ou crie `local.properties` na pasta `android/`:
```properties
sdk.dir=C:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Erro: "Could not resolve io.supabase:..."
- Verifique se `maven { url = uri("https://jitpack.io") }` está em `settings.gradle.kts`
- Sincronize o Gradle novamente

### App crasha ao abrir
- Verifique se o dispositivo tem API 26+ (Android 8.0+)
- Abra o **Logcat** no Android Studio para ver o erro

## 📝 Próximos Passos

- [ ] Implementar gráfico de pizza (já tem MPAndroidChart no build.gradle)
- [ ] Adicionar suporte offline (Room)
- [ ] Notificações push para lembretes
- [ ] Biometria para login
- [ ] Exportar dados para CSV
- [ ] Backup automático

## 🔗 Recursos

- [Documentação Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Supabase Kotlin SDK](https://supabase.com/docs/guides/with-kotlin)
- [Material Design 3](https://m3.material.io/)
- [MPAndroidChart](https://github.com/PhilJay/MPAndroidChart)

---

**Versão**: 2.0.0  
**Min SDK**: 26 (Android 8.0)  
**Target SDK**: 34 (Android 14)
