import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      setError("Invalid credentials. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.container}>
        <View style={s.header}>
          <View style={s.logoBox}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={s.logo}
            />
          </View>
          <Text style={s.brand}>KIMDASA</Text>
          <Text style={s.subtitle}>Field App</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputWrap}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.mutedForeground}
              style={s.inputIcon}
            />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              testID="email-input"
            />
          </View>

          <View style={s.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.mutedForeground}
              style={s.inputIcon}
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              testID="password-input"
            />
            <Pressable onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.loginBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.loginBtnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Text style={s.footer}>Kimdasa Construction · Field Management</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: insets.top + 40,
      paddingBottom: insets.bottom + 20,
      justifyContent: "space-between",
    },
    header: {
      alignItems: "center",
      marginBottom: 40,
    },
    logoBox: {
      width: 80,
      height: 80,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16,
      backgroundColor: "#0f172a",
    },
    logo: {
      width: 80,
      height: 80,
    },
    brand: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      letterSpacing: 6,
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    form: {
      gap: 12,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      height: 52,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    eyeBtn: {
      padding: 4,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    loginBtnText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    footer: {
      textAlign: "center",
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 24,
    },
  });
