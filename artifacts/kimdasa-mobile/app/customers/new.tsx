import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useCreateCustomer, getGetCustomersQueryKey } from "@workspace/api-client-react";

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  returnKeyType = "next",
  onSubmitEditing,
  inputRef,
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  multiline?: boolean;
  required?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={fieldStyles.wrap}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>
        {label}
        {required && <Text style={{ color: colors.primary }}> *</Text>}
      </Text>
      <TextInput
        ref={inputRef}
        style={[
          fieldStyles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
            height: multiline ? 80 : 48,
            textAlignVertical: multiline ? "top" : "center",
            paddingTop: multiline ? 12 : 0,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});

export default function NewCustomerScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ leadId?: string }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const createCustomer = useCreateCustomer();

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Customer name is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createCustomer.mutateAsync({
        data: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          leadId: params.leadId ? parseInt(params.leadId) : undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/customers/${result.id}`);
    } catch {
      Alert.alert("Error", "Could not create customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <FormField
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="John Smith"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        required
      />
      <FormField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="(201) 555-0100"
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        inputRef={phoneRef}
      />
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="john@example.com"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => addressRef.current?.focus()}
        inputRef={emailRef}
      />
      <FormField
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St, Hackensack, NJ"
        returnKeyType="next"
        onSubmitEditing={() => notesRef.current?.focus()}
        inputRef={addressRef}
      />
      <FormField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional notes..."
        returnKeyType="done"
        inputRef={notesRef}
        multiline
      />

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handleSave}
        disabled={saving}
        testID="save-customer-btn"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Customer</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  saveBtn: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
