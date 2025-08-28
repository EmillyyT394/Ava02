import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, Modal, Dimensions, Alert, StyleSheet, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const screenWidth = Dimensions.get("window").width;
const imageWidth = screenWidth / 2 - 20; // ajuste para caber centralizado

// ----------- LOGIN SCREEN -----------
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const eyeAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = () => {
      Animated.sequence([
        Animated.timing(eyeAnim, { toValue: 0.1, duration: 150, useNativeDriver: true }),
        Animated.timing(eyeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(2000),
      ]).start(() => blink());
    };
    blink();
  }, []);

  const login = async () => {
    const usersJSON = await AsyncStorage.getItem("users");
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      await AsyncStorage.setItem("currentUser", JSON.stringify(user));
      navigation.replace("AppTabs");
    } else {
      Alert.alert("Erro", "Email ou senha incorretos!");
    }
  };

  const register = async () => {
    if (!email || !password) return Alert.alert("Erro", "Preencha todos os campos");
    const usersJSON = await AsyncStorage.getItem("users");
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    if (users.find(u => u.email === email)) return Alert.alert("Erro", "Usuário já existe!");
    const newUser = { email, password, favorites: [], likedPosts: [], name: "", bio: "", theme: "light", profilePic: null, posts: [] };
    users.push(newUser);
    await AsyncStorage.setItem("users", JSON.stringify(users));
    await AsyncStorage.setItem("currentUser", JSON.stringify(newUser));
    navigation.replace("AppTabs");
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.logoContainer}>
        <Animated.View style={[styles.eye, { transform: [{ scaleY: eyeAnim }] }]} />
        <Animated.View style={[styles.eye, { transform: [{ scaleY: eyeAnim }] }]} />
      </View>
      <Text style={styles.loginTitle}>Memories Gallery 💛</Text>
      <TextInput placeholder="Email" keyboardType="email-address" style={styles.loginInput} value={email} onChangeText={setEmail} />
      <TextInput placeholder="Senha" style={styles.loginInput} value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.loginButton} onPress={login}><Text style={styles.loginButtonText}>Entrar</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.loginButton, { backgroundColor: "#ffd54f" }]} onPress={register}><Text style={styles.loginButtonText}>Cadastrar</Text></TouchableOpacity>
    </View>
  );
}

// ----------- GALLERY SCREEN -----------
function GalleryScreen({ theme }) {
  const [photos, setPhotos] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const userJSON = await AsyncStorage.getItem("currentUser");
      if (!userJSON) return;
      const user = JSON.parse(userJSON);
      setCurrentUser(user);
      const userPhotos = user.posts || [];
      setPhotos(userPhotos);
    };
    loadData();
  }, []);

  const saveUserData = async (updatedUser) => {
    const usersJSON = await AsyncStorage.getItem("users");
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    const index = users.findIndex((u) => u.email === updatedUser.email);
    users[index] = updatedUser;
    await AsyncStorage.setItem("users", JSON.stringify(users));
    await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const updateCaption = (id, text) => {
    const updatedPhotos = photos.map((p) => p.id === id ? { ...p, caption: text } : p);
    setPhotos(updatedPhotos);
    const updatedUser = { ...currentUser, posts: updatedPhotos };
    saveUserData(updatedUser);
  };

  const removePost = (id) => {
    Alert.alert("Remover Post", "Deseja remover este post?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        onPress: () => {
          const updatedPhotos = photos.filter((p) => p.id !== id);
          setPhotos(updatedPhotos);
          const updatedUser = { ...currentUser, posts: updatedPhotos };
          saveUserData(updatedUser);
        },
      },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      const newPhoto = { id: Date.now().toString(), uri: result.assets[0].uri, caption: "" };
      const updatedPhotos = [newPhoto, ...photos];
      setPhotos(updatedPhotos);
      const updatedUser = { ...currentUser, posts: [newPhoto, ...(currentUser.posts || [])] };
      saveUserData(updatedUser);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === "light" ? "#fff" : "#121212" }]}>
      {photos.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme === "light" ? "#333" : "#fff", fontSize: 18 }}>Nenhuma foto adicionada ainda</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12 }}
          columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { width: imageWidth, backgroundColor: "#fff9c4" }]}>
              <TouchableOpacity onPress={() => setSelectedImage(item)} activeOpacity={0.9} style={{ alignItems: "center", justifyContent: "center" }}>
                <Image source={{ uri: item.uri }} style={styles.image} />
              </TouchableOpacity>
              <TextInput
                style={styles.captionInput}
                placeholder="Escreva uma legenda..."
                placeholderTextColor="#999"
                value={item.caption}
                onChangeText={(text) => updateCaption(item.id, text)}
                multiline
              />
              <TouchableOpacity onPress={() => removePost(item.id)} style={{ alignSelf: "center", marginVertical: 6 }}>
                <AntDesign name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal */}
      <Modal visible={!!selectedImage} transparent={false} animationType="slide" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalContainer}>
          {selectedImage && (
            <>
              <Image source={{ uri: selectedImage.uri }} style={styles.modalImage} />
              <View style={styles.captionOverlay}>
                <Text style={styles.captionText}>{selectedImage.caption || "Sem legenda"}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
                <AntDesign name="closecircle" size={40} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Botão adicionar foto */}
      <TouchableOpacity style={[styles.themeButton, { bottom: 150, backgroundColor: "#f9a825" }]} onPress={pickImage}>
        <AntDesign name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ----------- PROFILE SCREEN -----------
function ProfileScreen({ theme, navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const userJSON = await AsyncStorage.getItem("currentUser");
      if (!userJSON) return;
      const user = JSON.parse(userJSON);
      setCurrentUser(user);
      setProfilePic(user.profilePic || null);
      setName(user.name || "");
      setBio(user.bio || "");
    };
    loadUser();
  }, []);

  const pickProfilePic = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para alterar a foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      setProfilePic(newUri);
      const updatedUser = { ...currentUser, profilePic: newUri };
      const usersJSON = await AsyncStorage.getItem("users");
      const users = usersJSON ? JSON.parse(usersJSON) : [];
      const index = users.findIndex(u => u.email === updatedUser.email);
      users[index] = updatedUser;
      await AsyncStorage.setItem("users", JSON.stringify(users));
      await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    }
  };

  const saveProfile = async () => {
    const updatedUser = { ...currentUser, name, bio, profilePic };
    const usersJSON = await AsyncStorage.getItem("users");
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    const index = users.findIndex(u => u.email === updatedUser.email);
    users[index] = updatedUser;
    await AsyncStorage.setItem("users", JSON.stringify(users));
    await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setEditing(false);
    Alert.alert("Perfil atualizado!");
  };

  const logout = async () => {
    await AsyncStorage.removeItem("currentUser");
    navigation.replace("Login");
  };

  if (!currentUser) return null;

  const backgroundColor = theme === "light" ? "#fff8cc" : "#1e1e1e";
  const cardColor = theme === "light" ? "#fff" : "#2a2a2a";
  const textColor = theme === "light" ? "#000" : "#fff";
  const labelColor = theme === "light" ? "#f3d530ff" : "#f9a825";

  return (
    <View style={{ flex: 1, backgroundColor, justifyContent: "center", alignItems: "center", padding: 20 }}>
      {!editing && (
        <Text style={{ color: "#ffb300", fontSize: 28, fontWeight: "bold", marginBottom: 15, textAlign: "center" }}>
          {name || "Não definido"}
        </Text>
      )}

      <TouchableOpacity onPress={editing ? pickProfilePic : null}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={{ width: 140, height: 140, borderRadius: 70, marginBottom: 20, borderWidth: 3, borderColor: labelColor }} />
        ) : (
          <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#ccc", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <AntDesign name="user" size={60} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <View style={{ width: "95%", backgroundColor: cardColor, borderRadius: 30, padding: 35, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 5 }, shadowRadius: 8, elevation: 6 }}>
        {editing && (
          <>
            <Text style={{ color: labelColor, fontWeight: "bold", fontSize: 16 }}>Nome de usuário</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: labelColor, textAlign: "center" }]} value={name} onChangeText={setName} />
          </>
        )}

        <Text style={{ color: labelColor, fontWeight: "bold", fontSize: 16 }}>Biografia</Text>
        {editing ? (
          <TextInput style={[styles.input, { color: textColor, borderColor: labelColor, textAlign: "center" }]} value={bio} onChangeText={setBio} />
        ) : (
          <Text style={{ color: textColor, marginBottom: 20, textAlign: "center" }}>{bio || "Não definida"}</Text>
        )}

        <Text style={{ color: labelColor, fontWeight: "bold", fontSize: 16 }}>Email</Text>
        <Text style={{ color: textColor, marginBottom: 0, textAlign: "center" }}>{currentUser.email}</Text>
      </View>

      {editing ? (
        <TouchableOpacity style={[styles.authButton, { backgroundColor: "#4caf50", marginTop: 20 }]} onPress={saveProfile}>
          <Text style={styles.authButtonText}>Salvar Perfil</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.authButton, { backgroundColor: "#f39c21ff", marginTop: 20 }]} onPress={() => setEditing(true)}>
          <Text style={styles.authButtonText}>Editar Perfil</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.authButton, { backgroundColor: "#f46236ff", marginTop: 10, width: "50%", paddingVertical: 12 }]} onPress={logout}>
        <Text style={[styles.authButtonText, { fontSize: 14 }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----------- APP TABS -----------
function AppTabs({ theme, setTheme }) {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0a0a0aff",
          tabBarStyle: { backgroundColor: theme === "light" ? "#fff59d" : "#333" },
        }}
      >
        <Tab.Screen name="GalleryTab" children={() => <GalleryScreen theme={theme} />} options={{ tabBarLabel: "Galeria", tabBarIcon: ({ color, size }) => <AntDesign name="picture" size={size} color={color} /> }} />
        <Tab.Screen name="ProfileTab" children={({ navigation }) => <ProfileScreen theme={theme} navigation={navigation} />} options={{ tabBarLabel: "Perfil", tabBarIcon: ({ color, size }) => <AntDesign name="user" size={size} color={color} /> }} />
      </Tab.Navigator>

      {/* Botão tema */}
      <TouchableOpacity style={styles.themeButton} onPress={() => setTheme(prev => (prev === "light" ? "dark" : "light"))}>
        <Text style={{ fontSize: 28, textAlign: "center" }}>{theme === "light" ? "🌙" : "☀️"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----------- APP -----------
export default function App() {
  const [theme, setTheme] = useState("light");

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AppTabs" options={{ headerShown: false }}>{() => <AppTabs theme={theme} setTheme={setTheme} />}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ----------- STYLES -----------
const styles = StyleSheet.create({
  // --- Login ---
  loginContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff8cc", padding: 20 },
  logoContainer: { flexDirection: "row", marginBottom: 30 },
  eye: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#000", marginHorizontal: 10 },
  loginTitle: { fontSize: 28, fontWeight: "bold", color: "#ffb300", marginBottom: 20 },
  loginInput: { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 12, marginBottom: 15, fontSize: 16 },
  loginButton: { backgroundColor: "#ffb300", padding: 15, borderRadius: 20, width: "100%", marginBottom: 10 },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: "center" },

  // --- Auth/Profile ---
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginBottom: 10 },
  authButton: { backgroundColor: "#fbc02d", padding: 15, borderRadius: 10, width: "100%", marginBottom: 10 },
  authButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: "center" },

  // --- Gallery ---
  container: { flex: 1 },
  card: { borderRadius: 16, overflow: "hidden", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4 },
  image: { width: "90%", height: 150, borderRadius: 16, alignSelf: "center", marginVertical: 10, resizeMode: "cover" },
  captionInput: { padding: 10, fontSize: 15, color: "#333", backgroundColor: "#ffffff", borderRadius: 10, marginHorizontal: 8, marginTop: 8, minHeight: 60, textAlignVertical: "top", textAlign: "center" },

  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  modalImage: { width: "90%", height: "70%", resizeMode: "contain" },
  captionOverlay: { position: "absolute", bottom: 30, left: 0, right: 0, padding: 16, backgroundColor: "rgba(0, 0, 0, 0.6)" },
  captionText: { color: "#fff", fontSize: 18, textAlign: "center" },
  closeButton: { position: "absolute", top: 40, right: 20 },

  // --- Theme Button ---
  themeButton: { position: "absolute", bottom: 130, right: 0, backgroundColor: "#f7f78fff", borderRadius: 35, height: 50, width: 50, justifyContent: "center", alignItems: "center", elevation: 5 },
});

