import useAuthStore from "@/store/auth.store";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const login = () => {
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("test");
  const { logIn } = useAuthStore();

  const handlePress = () => {
    if (username.trim() === "" || password.trim() === "") {
      Alert.alert("Error", "Both fields required");
    }
    logIn();
    console.log(username, password, "pressed");
  };
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Username"
        style={styles.userInputFields}
        onChangeText={setUsername}
        value={username}
      />
      <TextInput
        placeholder="Password"
        style={styles.userInputFields}
        onChangeText={setPassword}
        value={password}
      />
      <Pressable style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonLabel}>Sign in</Text>
      </Pressable>
    </View>
  );
};

export default login;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    gap: 10,
  },
  userInputFields: {
    borderWidth: 1,
    borderColor: "lightgray",
    borderRadius: 8,
  },
  button: {
    backgroundColor: "lightblue",
    borderWidth: 1,
    alignSelf: "baseline",
    padding: 10,
    borderRadius: 8,
    borderColor: "lightblue",
    boxShadow: "0px 3px 20px 1px rgba(0,0,0,0.1)",
  },
  buttonLabel: {
    color: "#ffffff",
  },
});
