import { ScrollView } from "./KeyboardLayout";
import { Text, TextInput } from "./themedText";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BrandLogo } from "./BrandLogo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Shield } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "./figmaComponents";
import { ui, uiShadow } from "./figmaTheme";
import { useAppStore } from "./store";
import { api } from "./api";
import { errorMessage } from "./api/client";
import { Field, openWeb } from "./liveUi";

export function FigmaLogin() {
  const workspaceInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const login = useAppStore((x) => x.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());
  const changeEmail = (value: string) => {
    setEmail(value);
    setResetSent(false);
    if (errors.email)
      setErrors((current) => ({ ...current, email: undefined }));
  };
  const changePassword = (value: string) => {
    setPassword(value);
    if (errors.password)
      setErrors((current) => ({ ...current, password: undefined }));
  };
  const submit = async () => {
    if (busy) return;
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email address is required.";
    else if (!validEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFailure(null);
    try {
      await login(email, password, slug, remember);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const sendReset = async () => {
    if (busy) return;
    if (!email.trim()) {
      setErrors({ email: "Email address is required." });
      return;
    }
    if (!validEmail(email)) {
      setErrors({ email: "Enter a valid email address." });
      return;
    }
    setErrors({});
    setBusy(true);
    setFailure(null);
    setResetSent(false);
    try {
      await api.forgotPassword(email, slug);
      setResetSent(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.login}>
      <SafeAreaView style={s.loginSafe}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.loginScroll}
        >
          <View style={s.loginBrand}>
            <BrandLogo variant="primary" width={280} />
          </View>
          <View style={s.loginIntro}>
            <Text style={s.welcome}>
              {forgot ? "Reset your password" : "Welcome back"}
            </Text>
            <Text style={s.secure}>
              {forgot
                ? "We’ll send a secure reset link to your inbox."
                : "Sign in to continue to your workspace."}
            </Text>
          </View>
          <Surface style={s.loginCard}>
            {resetSent && (
              <View style={s.resetSuccess}>
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={21}
                  color={ui.success}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.resetSuccessTitle}>Check your inbox</Text>
                  <Text style={s.resetSuccessText}>
                    If this email belongs to an account, you will receive a
                    password reset link.
                  </Text>
                </View>
              </View>
            )}
            <Text style={s.fieldLabel}>Email address</Text>
            <View style={[s.authInput, errors.email && s.authInputError]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={errors.email ? ui.danger : ui.muted}
              />
              <TextInput
                value={email}
                onChangeText={changeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                placeholder="name@company.com"
                placeholderTextColor={ui.muted}
                style={s.authInputText}
                returnKeyType={forgot ? "send" : "next"}
                submitBehavior={forgot ? "blurAndSubmit" : "submit"}
                onSubmitEditing={
                  forgot ? sendReset : () => workspaceInput.current?.focus()
                }
              />
            </View>
            {errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
            <View style={{ marginTop: 14 }}>
              <Field
                ref={workspaceInput}
                label="Workspace slug (optional)"
                value={slug}
                onChangeText={setSlug}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Your workspace slug"
                editable={!busy}
                returnKeyType={forgot ? "send" : "next"}
                submitBehavior={forgot ? "blurAndSubmit" : "submit"}
                onSubmitEditing={
                  forgot ? sendReset : () => passwordInput.current?.focus()
                }
              />
            </View>
            {!forgot && (
              <>
                <Text style={[s.fieldLabel, s.passwordLabel]}>Password</Text>
                <View
                  style={[s.authInput, errors.password && s.authInputError]}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={errors.password ? ui.danger : ui.muted}
                  />
                  <TextInput
                    ref={passwordInput}
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={changePassword}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    placeholder="Enter your password"
                    placeholderTextColor={ui.muted}
                    style={s.authInputText}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onPress={() => setShowPassword((value) => !value)}
                    hitSlop={10}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={21}
                      color={ui.body}
                    />
                  </Pressable>
                </View>
                {errors.password && (
                  <Text style={s.fieldError}>{errors.password}</Text>
                )}
                <View style={s.loginOptions}>
                  <Pressable
                    onPress={() => setRemember((value) => !value)}
                    style={s.rememberRow}
                  >
                    <View style={[s.checkbox, remember && s.checkboxChecked]}>
                      {remember && (
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color="white"
                        />
                      )}
                    </View>
                    <Text style={s.rememberText}>Remember me</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setForgot(true);
                      setErrors({});
                      setResetSent(false);
                    }}
                    hitSlop={8}
                  >
                    <Text style={s.forgotLink}>Forgot password?</Text>
                  </Pressable>
                </View>
              </>
            )}
            <Pressable
              disabled={busy}
              onPress={forgot ? sendReset : submit}
              style={({ pressed }) => [
                s.loginButton,
                pressed && s.loginButtonPressed,
              ]}
            >
              <Text style={s.loginButtonText}>
                {busy ? "Please wait…" : forgot ? "Send reset link" : "Sign in"}
              </Text>
              <MaterialCommunityIcons
                name={forgot ? "email-fast-outline" : "arrow-right"}
                size={20}
                color="white"
              />
            </Pressable>
            {failure && (
              <Text accessibilityRole="alert" style={s.fieldError}>
                {failure}
              </Text>
            )}
            {forgot && (
              <Pressable
                onPress={() => {
                  setForgot(false);
                  setErrors({});
                  setResetSent(false);
                }}
                style={s.backToLogin}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={18}
                  color={ui.primary}
                />
                <Text style={s.backToLoginText}>Back to sign in</Text>
              </Pressable>
            )}
          </Surface>
          <View style={s.securityNote}>
            <Shield size={15} color={ui.primaryHover} />
            <Text style={s.enterpriseText}>ENTERPRISE-GRADE SECURITY</Text>
          </View>
          <Text style={s.terms}>
            By continuing, you agree to KshanaAPI's{" "}
            <Text
              style={s.termsLink}
              onPress={() => openWeb("/terms-and-conditions")}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={s.termsLink}
              onPress={() => openWeb("/privacy-policy")}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export {
  FigmaHome,
  FigmaInbox,
  FigmaConversation,
  FigmaAlerts,
  FigmaCampaigns,
  FigmaProfile,
} from "./liveScreens";

const s = StyleSheet.create({
  login: { flex: 1, backgroundColor: ui.bg },
  loginSafe: { flex: 1 },
  loginScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: "center",
  },
  loginBrand: {
    height: 68,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loginIntro: { alignItems: "center", marginBottom: 22 },
  welcome: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800",
    color: ui.ink,
    textAlign: "center",
  },
  secure: {
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 21,
    color: ui.body,
    marginTop: 6,
    textAlign: "center",
  },
  loginCard: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 22,
    borderRadius: 28,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: ui.ink,
    marginBottom: 8,
  },
  passwordLabel: { marginTop: 18 },
  authInput: {
    minHeight: 54,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 24,
    backgroundColor: ui.white,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authInputError: { borderColor: ui.danger, backgroundColor: ui.dangerSurface },
  authInputText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: ui.ink,
    paddingVertical: 0,
  },
  fieldError: { fontSize: 12, color: ui.danger, marginTop: 6 },
  loginOptions: {
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rememberRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ui.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: ui.primary, borderColor: ui.primary },
  rememberText: { fontSize: 13, color: ui.body },
  forgotLink: { fontSize: 13, fontWeight: "700", color: ui.primary },
  loginButton: {
    height: 54,
    borderRadius: 28,
    backgroundColor: ui.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    shadowColor: ui.primary,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  loginButtonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  loginButtonText: { fontSize: 16, fontWeight: "700", color: "white" },
  backToLogin: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
  },
  backToLoginText: { fontSize: 14, fontWeight: "700", color: ui.primary },
  resetSuccess: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: ui.successSurface,
    borderWidth: 1,
    borderColor: ui.line,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
  },
  resetSuccessTitle: { fontSize: 13, fontWeight: "700", color: ui.success },
  resetSuccessText: {
    fontSize: 12,
    lineHeight: 17,
    color: ui.primary,
    marginTop: 2,
  },
  securityNote: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  enterpriseText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: ui.primaryHover,
  },
  terms: {
    maxWidth: 390,
    alignSelf: "center",
    fontSize: 11,
    lineHeight: 17,
    color: ui.muted,
    textAlign: "center",
    marginTop: 14,
  },
  termsLink: { color: ui.primary, fontWeight: "600" },
});
