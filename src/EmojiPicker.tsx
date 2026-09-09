import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, KeyboardFrame } from "./KeyboardLayout";
import { Text, TextInput } from "./themedText";
import { Button, l } from "./liveUi";
import { ui } from "./figmaTheme";
// Same searchable Unicode catalog as the web picker; license in assets/licenses.
import emojis from "./emojiData.json";
const categories = [...new Set(emojis.map((item) => item.category))];
const tones = [0, 0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff];
export function EmojiPicker({
  visible,
  onClose,
  onSelect,
  title = "Choose an emoji",
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  title?: string;
}) {
  const [category, setCategory] = useState(categories[0]);
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState(0);
  const { height, width } = useWindowDimensions();
  const columns = Math.max(4, Math.floor((width - 32) / 48));
  const matches = useMemo(
    () =>
      emojis.filter((item) =>
        query.trim()
          ? (item.keywords + " " + item.category + " " + item.emoji)
              .toLowerCase()
              .includes(query.trim().toLowerCase())
          : item.category === category,
      ),
    [query, category],
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardFrame style={{ flex: 1, backgroundColor: "#00000066" }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            style={{ flex: 1 }}
            accessibilityLabel="Close emoji picker"
            onPress={onClose}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={{
              backgroundColor: ui.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 16,
              height: Math.min(height * 0.7, 520),
              flexShrink: 1,
            }}
          >
            <View style={l.between}>
              <Text style={[l.heading, { flex: 1 }]}>{title}</Text>
              <Button title="Done" secondary onPress={onClose} />
            </View>
            <TextInput
              accessibilityLabel="Search emojis"
              placeholder="Search emojis"
              value={query}
              onChangeText={setQuery}
              style={[l.input, { marginVertical: 8 }]}
            />
            <ScrollView
              horizontal
              style={{ flexGrow: 0, flexShrink: 0 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {categories.map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: category === name }}
                  onPress={() => {
                    setCategory(name);
                    setQuery("");
                  }}
                  style={{
                    padding: 10,
                    borderRadius: 18,
                    backgroundColor: category === name ? ui.primary : ui.bg,
                  }}
                >
                  <Text
                    style={{ color: category === name ? ui.white : ui.ink }}
                  >
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {tones.map((code, index) => (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityLabel={
                    index ? "Skin tone " + index : "Default skin tone"
                  }
                  accessibilityState={{ selected: tone === index }}
                  onPress={() => setTone(index)}
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: tone === index ? ui.accent : ui.white,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>
                    {String.fromCodePoint(0x1f44b, ...(code ? [code] : []))}
                  </Text>
                </Pressable>
              ))}
            </View>
            <FlatList
              key={columns + category + query}
              data={matches}
              numColumns={columns}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={42}
              windowSize={5}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={l.muted}>No matching emojis.</Text>
              }
              renderItem={({ item }) => {
                const emoji = tone
                  ? item.variations[tone - 1] || item.emoji
                  : item.emoji;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    onPress={() => onSelect(emoji)}
                    style={{
                      width: 48,
                      height: 48,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{emoji}</Text>
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </KeyboardFrame>
    </Modal>
  );
}
