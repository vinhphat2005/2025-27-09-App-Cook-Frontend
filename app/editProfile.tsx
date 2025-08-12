import { useNavigation } from "expo-router";
import {
  Button,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";

export default function EditProfile() {
  const [text, setText] = useState("");
  const onSubmit = () => {
    // TODO: call API to save rating & comment

    if (typeof navigation !== "undefined" && navigation?.goBack) {
      navigation.goBack();
    } else if (typeof window !== "undefined" && window.history) {
      window.history.back();
    }
  };

  const [image, setImage] = useState<string | null>(null);
  const navigation = useNavigation();
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {image && <Image source={{ uri: image }} style={styles.image} />}
        <Button title="Đổi ảnh đại diện" onPress={pickImage} />
      </View>

      <Text style={styles.displayName}>Tên hiển thị</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        value={text}
        onChangeText={setText}
      />
      <View style={styles.apply}>
        <Pressable
          style={styles.buttonChange}
          onPress={() => {
            onSubmit;
          }}
        >
          <Text style={styles.textChange}>Lưu thay đổi</Text>{" "}
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    // alignItems: "center",
    gap: 20,
    paddingTop: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fbfbfb",
  },
  avatarContainer: {
    alignItems: "center",
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: "50%",
  },

  displayName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  input: {
    height: 40,
    borderColor: "gray",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  apply: {
    borderRadius: 10,
    width: "100%",
    paddingHorizontal: 20,
  },
  buttonChange: {
    width: "100%",
    backgroundColor: "#ff2a2e",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
  },
  textChange: { fontSize: 25, color: "white" },
});
