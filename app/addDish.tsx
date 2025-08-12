import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';

export default function AddDish() {
  const { user, token, requireAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [dishName, setDishName] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [ingredients, setIngredients] = useState(['']);
  const [instructions, setInstructions] = useState(['']);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  
  // Recipe additional fields
  const [recipeDescription, setRecipeDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Dễ');

  React.useEffect(() => {
    requireAuth();
  }, []);

  // Image picker
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);
      setImageBase64(selectedImage.base64);
      setImageMime(selectedImage.mimeType || 'image/jpeg');
    }
  };

  // Add ingredient
  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  // Remove ingredient
  const removeIngredient = (index) => {
    if (ingredients.length > 1) {
      const newIngredients = ingredients.filter((_, i) => i !== index);
      setIngredients(newIngredients);
    }
  };

  // Update ingredient
  const updateIngredient = (index, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  // Add instruction
  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  // Remove instruction
  const removeInstruction = (index) => {
    if (instructions.length > 1) {
      const newInstructions = instructions.filter((_, i) => i !== index);
      setInstructions(newInstructions);
    }
  };

  // Update instruction
  const updateInstruction = (index, value) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  // Validate form
  const validateForm = () => {
    if (!dishName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn!');
      return false;
    }
    if (!cookingTime || isNaN(cookingTime) || parseInt(cookingTime) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập thời gian nấu hợp lệ!');
      return false;
    }
    if (ingredients.filter(ing => ing.trim()).length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất một nguyên liệu!');
      return false;
    }
    if (instructions.filter(inst => inst.trim()).length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất một bước hướng dẫn!');
      return false;
    }
    if (!image) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh cho món ăn!');
      return false;
    }
    return true;
  };

  // Create dish
  const createDish = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const filteredIngredients = ingredients.filter(ing => ing.trim());
      const filteredInstructions = instructions.filter(inst => inst.trim());

      const dishData = {
        name: dishName.trim(),
        ingredients: filteredIngredients,
        cooking_time: parseInt(cookingTime),
        image_b64: imageBase64,
        image_mime: imageMime,
        recipe_name: `Cách làm ${dishName.trim()}`,
        recipe_description: recipeDescription.trim() || `Hướng dẫn làm ${dishName.trim()}`,
        recipe_ingredients: filteredIngredients, // Same as dish ingredients
        difficulty: difficulty,
        instructions: filteredInstructions,
      };

      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      
      if (!API_URL) {
        Alert.alert('Lỗi', 'Thiếu cấu hình EXPO_PUBLIC_API_URL');
        return; 
      }

      const response = await fetch(`${API_URL}/dishes/with-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dishData),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Thành công', 'Tạo món ăn thành công!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Lỗi', error.detail || 'Có lỗi xảy ra!');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối đến server!');
      console.error('Create dish error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.title}>Tạo món ăn mới</Text>
      
      {/* Image Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ảnh món ăn *</Text>
        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={40} color="#999" />
              <Text style={styles.imagePlaceholderText}>Chọn ảnh</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Dish Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tên món ăn *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập tên món ăn..."
          value={dishName}
          onChangeText={setDishName}
        />
      </View>

      {/* Cooking Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thời gian nấu (phút) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: 30"
          value={cookingTime}
          onChangeText={setCookingTime}
          keyboardType="numeric"
        />
      </View>

      {/* Difficulty */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Độ khó</Text>
        <View style={styles.difficultyContainer}>
          {['Dễ', 'Trung bình', 'Khó'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                difficulty === level && styles.difficultyButtonActive
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text style={[
                styles.difficultyText,
                difficulty === level && styles.difficultyTextActive
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recipe Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mô tả công thức</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mô tả ngắn về món ăn..."
          value={recipeDescription}
          onChangeText={setRecipeDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nguyên liệu *</Text>
          <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#dc502e" />
          </TouchableOpacity>
        </View>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={`Nguyên liệu ${index + 1}...`}
              value={ingredient}
              onChangeText={(value) => updateIngredient(index, value)}
            />
            {ingredients.length > 1 && (
              <TouchableOpacity
                onPress={() => removeIngredient(index)}
                style={styles.removeButton}
              >
                <Ionicons name="trash" size={20} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hướng dẫn nấu *</Text>
          <TouchableOpacity onPress={addInstruction} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#dc502e" />
          </TouchableOpacity>
        </View>
        {instructions.map((instruction, index) => (
          <View key={index} style={styles.inputRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={`Bước ${index + 1}...`}
              value={instruction}
              onChangeText={(value) => updateInstruction(index, value)}
              multiline
            />
            {instructions.length > 1 && (
              <TouchableOpacity
                onPress={() => removeInstruction(index)}
                style={styles.removeButton}
              >
                <Ionicons name="trash" size={20} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={createDish}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.createButtonText}>Tạo món ăn</Text>
        )}
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  inputFlex: {
    flex: 1,
  },
  stepNumber: {
    backgroundColor: '#dc502e',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 12,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc502e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 12,
  },
  imageUpload: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 16,
    marginTop: 8,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#dc502e',
    borderColor: '#dc502e',
  },
  difficultyText: {
    fontSize: 14,
    color: '#666',
  },
  difficultyTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#dc502e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});