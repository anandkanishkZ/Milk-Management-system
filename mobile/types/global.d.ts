/// <reference types="expo/types" />

import type { ComponentType } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';

// Fix for Expo Router
declare module 'expo-router' {
  export interface TabBarIconProps {
    focused: boolean;
    color: string;
    size: number;
  }

  export interface ScreenOptions {
    title?: string;
    href?: string | null;
    tabBarIcon?: (props: TabBarIconProps) => React.ReactNode;
    tabBarActiveTintColor?: string;
    tabBarInactiveTintColor?: string;
    tabBarStyle?: ViewStyle;
    headerShown?: boolean;
  }

  export interface TabsProps {
    screenOptions?: ScreenOptions;
    children: React.ReactNode;
  }

  export interface TabsScreen {
    Screen: ComponentType<{
      name: string;
      options?: ScreenOptions;
    }>;
  }

  export interface StackScreen {
    Screen: React.ComponentType<{
      name: string;
      options?: Record<string, any>;
    }>;
  }
  export const Tabs: ComponentType<TabsProps> & TabsScreen;
  export const Stack: React.ComponentType<any> & StackScreen;
  export function useRouter(): {
    push: (path: string) => void;
    replace: (path: string) => void;
    back: () => void;
  };
  export function usePathname(): string;
}

// Fix for Expo Status Bar
declare module 'expo-status-bar' {
  export interface StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    backgroundColor?: string;
    translucent?: boolean;
    hidden?: boolean;
  }
  export const StatusBar: ComponentType<StatusBarProps>;
}

// Fix for Expo Linear Gradient
declare module 'expo-linear-gradient' {
  export interface LinearGradientProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: ViewStyle;
    children?: React.ReactNode;
  }
  export const LinearGradient: ComponentType<LinearGradientProps>;
}

// Fix for Expo Vector Icons
declare module '@expo/vector-icons' {
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }
  export const Ionicons: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
}

// Fix for Expo Crypto
declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA1 = 'SHA1',
    SHA256 = 'SHA256',
    SHA384 = 'SHA384',
    SHA512 = 'SHA512',
    MD2 = 'MD2',
    MD4 = 'MD4',
    MD5 = 'MD5'
  }

  export interface CryptoDigestOptions {
    encoding: 'hex' | 'base64';
  }

  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm,
    data: string,
    options?: CryptoDigestOptions
  ): Promise<string>;

  export function getRandomBytes(byteCount: number): Uint8Array;
  export function getRandomBytesAsync(byteCount: number): Promise<Uint8Array>;
}

// Global type augmentations
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_FIREBASE_API_KEY: string;
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
      EXPO_PUBLIC_FIREBASE_APP_ID: string;
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
    }
  }
}

export {};