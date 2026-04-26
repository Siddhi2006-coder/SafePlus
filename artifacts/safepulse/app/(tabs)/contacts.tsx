import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getListContactsQueryKey,
  useCreateContact,
  useDeleteContact,
  useListContacts,
  type Contact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { GradientBg } from "@/components/GradientBg";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { TextField } from "@/components/TextField";
import { useColors } from "@/hooks/useColors";

const RELATIONS = ["Family", "Partner", "Friend", "Roommate", "Colleague", "Other"];

export default function ContactsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const qc = useQueryClient();

  const list = useListContacts();
  const createMut = useCreateContact();
  const deleteMut = useDeleteContact();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState<string>("Family");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPhone("");
    setRelation("Family");
    setError(null);
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Add a name and phone number.");
      return;
    }
    setError(null);
    try {
      await createMut.mutateAsync({
        data: { name: name.trim(), phone: phone.trim(), relation },
      });
      await qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
      reset();
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message.replace(/^HTTP \d+ [^:]*: ?/, "") : "Could not add contact",
      );
    }
  };

  const remove = async (contact: Contact) => {
    try {
      await deleteMut.mutateAsync({ id: contact.id });
      await qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
    } catch {
      /* ignore */
    }
  };

  const data = list.data ?? [];

  return (
    <GradientBg>
      <View
        style={[
          styles.header,
          { paddingTop: (isWeb ? 67 : insets.top) + 16 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.foreground }]}>
            Trusted circle
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            The people we'll alert the instant you hit SOS.
          </Text>
        </View>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: c.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityLabel="Add contact"
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      {list.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : data.length === 0 ? (
        <View
          style={[
            styles.empty,
            { paddingBottom: (isWeb ? 84 : insets.bottom + 70) + 24 },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: c.secondary },
            ]}
          >
            <Feather name="users" size={28} color={c.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            Build your safety circle
          </Text>
          <Text style={[styles.emptyHint, { color: c.mutedForeground }]}>
            Add at least one trusted person. They'll get a call, an SMS, a
            WhatsApp ping, and a push notification when you trigger SOS.
          </Text>
          <PrimaryButton label="Add first contact" onPress={() => setOpen(true)} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id.toString()}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: (isWeb ? 84 : insets.bottom + 70) + 28,
            gap: 12,
          }}
          renderItem={({ item }) => (
            <ContactRow contact={item} onDelete={() => remove(item)} />
          )}
        />
      )}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(13,10,35,0.45)" },
          ]}
          onPress={() => setOpen(false)}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              paddingBottom: (isWeb ? 34 : insets.bottom) + 20,
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: c.foreground }]}>
            Add to your circle
          </Text>
          <View style={{ gap: 14, marginTop: 16 }}>
            <TextField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Mom"
              autoCapitalize="words"
            />
            <TextField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 0100"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <View>
              <Text
                style={{
                  color: c.mutedForeground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Relation
              </Text>
              <View style={styles.chips}>
                {RELATIONS.map((r) => {
                  const active = r === relation;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRelation(r)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: active ? c.primary : c.muted,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active ? "#fff" : c.foreground,
                          },
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {error ? (
              <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text>
            ) : null}
            <PrimaryButton
              label="Add to circle"
              onPress={submit}
              loading={createMut.isPending}
            />
            <PrimaryButton
              label="Cancel"
              variant="ghost"
              onPress={() => {
                reset();
                setOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </GradientBg>
  );
}

function ContactRow({
  contact,
  onDelete,
}: {
  contact: Contact;
  onDelete: () => void;
}) {
  const c = useColors();
  const initials = contact.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <SectionCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.secondary },
          ]}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: "Inter_700Bold",
              fontSize: 16,
            }}
          >
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 16,
            }}
          >
            {contact.name}
          </Text>
          <Text
            style={{
              color: c.mutedForeground,
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {contact.relation} · {contact.phone}
          </Text>
        </View>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: c.muted, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="trash-2" size={16} color={c.destructive} />
        </Pressable>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 4,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  emptyHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.4,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
