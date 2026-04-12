# Somos R - Mobile

Aplicación móvil de Somos R construida con React Native, Expo, TypeScript y NativeWind.

## Requisitos previos

- Node.js 18+ o superior
- pnpm 9+
- Expo CLI (instalación global recomendada)
- iOS 14+ (para compilar en iOS)
- Android 6+ (para compilar en Android)

## Instalación

```bash
# Instalar dependencias
pnpm install
```

## Desarrollo

```bash
# Iniciar servidor de Expo
pnpm start

# O iniciar directamente para Android
pnpm android

# O iniciar directamente para iOS
pnpm ios

# O iniciar web
pnpm web
```

Desde el servidor de Expo, puedes:
- Presionar `a` para abrir en Android Emulator
- Presionar `i` para abrir en iOS Simulator
- Presionar `w` para abrir en web
- Escanear el código QR con la app Expo Go en tu dispositivo

## Compilación

### Previamente

Asegúrate de tener una cuenta en Expo y haber ejecutado:
```bash
expo login
```

### Compilación en la nube (recomendado)

```bash
eas build --platform android
eas build --platform ios
```

## Lint y formato

```bash
# Ejecutar ESLint
pnpm lint

# Formatear código (próximamente)
pnpm format
```

## Estructura del proyecto

```
somos-r-mobile/
├── app/
│   ├── (tabs)/              # Navegación con tabs
│   │   ├── index.tsx        # Pestaña inicio
│   │   ├── two.tsx          # Pestaña dos
│   │   └── _layout.tsx      # Layout de tabs
│   ├── components/          # Componentes reutilizables
│   ├── constants/           # Constantes (colores, temas, etc)
│   ├── hooks/               # Custom hooks
│   ├── services/            # Servicios y API calls
│   ├── stores/              # Estado global (Zustand)
│   ├── types/               # Tipos TypeScript
│   └── _layout.tsx          # Layout raíz
├── assets/                  # Imágenes, fuentes, etc
├── tailwind.config.js       # Configuración de Tailwind
├── app.json                 # Configuración de Expo
├── tsconfig.json            # Configuración de TypeScript
└── package.json             # Dependencias del proyecto
```

## Stack tecnológico

- **React Native**: 0.81.5
- **Expo**: 54.0.33
- **Expo Router**: 6.0.23
- **TypeScript**: 5.9.2
- **React**: 19.1.0
- **Zustand**: 5.0.12
- **Axios**: 1.15.0
- **React Query**: 5.99.0
- **NativeWind**: 4.2.3 (Tailwind para React Native)

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
EXPO_PUBLIC_API_URL=https://api.example.com
```

## Solución de problemas

### Los cambios no se reflejan
- Presiona `r` en el servidor de Expo para recargar
- Para cambios mayores, reinicia el servidor

### Problemas de dependencias
```bash
# Limpiar cache de Expo
expo prebuild --clean

# O reinstalar todo
rm -rf node_modules .expo
pnpm install
```

## Licencia

Privado - Somos R
