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

  // Enhanced image picker với compression tốt hơn
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
      quality: 0.7, // Giảm chút để tối ưu size khi gửi lên server
      base64: true,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);
      setImageBase64(selectedImage.base64);
      setImageMime(selectedImage.mimeType || 'image/jpeg');
      
      // Log để debug
      console.log('Image selected:', {
        uri: selectedImage.uri,
        mimeType: selectedImage.mimeType,
        base64Length: selectedImage.base64?.length || 0
      });
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

  // Enhanced validation với error messages rõ ràng hơn
  const validateForm = () => {
    if (!dishName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn!');
      return false;
    }
    
    if (!cookingTime || isNaN(cookingTime) || parseInt(cookingTime) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập thời gian nấu hợp lệ (số phút > 0)!');
      return false;
    }
    
    const validIngredients = ingredients.filter(ing => ing.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất một nguyên liệu!');
      return false;
    }
    
    const validInstructions = instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất một bước hướng dẫn!');
      return false;
    }
    
    if (!image || !imageBase64) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh cho món ăn!');
      return false;
    }
    
    return true;
  };

  // Enhanced create dish với error handling tốt hơn
  const createDish = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const filteredIngredients = ingredients.filter(ing => ing.trim());
      const filteredInstructions = instructions.filter(inst => inst.trim());

      const dishData = {
        // Basic dish info
        name: dishName.trim(),
        ingredients: filteredIngredients,
        cooking_time: parseInt(cookingTime),
        
        // Image data - backend sẽ upload lên Cloudinary
        image_b64: imageBase64,
        image_mime: imageMime,
        
        // Recipe info
        recipe_name: `Cách làm ${dishName.trim()}`,
        recipe_description: recipeDescription.trim() || `Hướng dẫn làm ${dishName.trim()}`,
        recipe_ingredients: filteredIngredients, // Same as dish ingredients
        difficulty: difficulty,
        instructions: filteredInstructions,
      };

      console.log('Sending dish data:', {
        ...dishData,
        image_b64: `[base64 data - ${imageBase64?.length || 0} characters]` // Don't log full base64
      });

      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      
      if (!API_URL) {
        Alert.alert('Lỗi cấu hình', 'Thiếu cấu hình EXPO_PUBLIC_API_URL trong môi trường');
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

      const result = await response.json();
      
      if (response.ok) {
        console.log('Dish created successfully:', result);
        Alert.alert(
          'Thành công! 🎉', 
          result.message || 'Tạo món ăn và công thức thành công!',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } else {
        console.error('Server error:', result);
        // Handle specific error cases
        let errorMessage = 'Có lỗi xảy ra!';
        
        if (response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';
        } else if (response.status === 413) {
          errorMessage = 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn!';
        } else if (response.status === 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau!';
        } else if (result.detail) {
          errorMessage = result.detail;
        }
        
        Alert.alert('Lỗi', errorMessage);
      }
    } catch (error) {
      console.error('Create dish error:', error);
      
      let errorMessage = 'Không thể kết nối đến server!';
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet!';
      } else if (error.name === 'TimeoutError') {
        errorMessage = 'Yêu cầu quá thời gian. Vui lòng thử lại!';
      }
      
      Alert.alert('Lỗi kết nối', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Camera option
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Lỗi', 'Cần quyền truy cập camera!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);
      setImageBase64(selectedImage.base64);
      setImageMime(selectedImage.mimeType || 'image/jpeg');
    }
  };

  // Show image picker options
  const showImagePicker = () => {
    Alert.alert(
      'Chọn ảnh',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Thư viện', onPress: pickImage },
        { text: 'Camera', onPress: takePhoto },
        { text: 'Hủy', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.title}>Tạo món ăn mới</Text>
      
      {/* Image Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ảnh món ăn *</Text>
        <TouchableOpacity style={styles.imageUpload} onPress={showImagePicker}>
          {image ? (
            <>
              <Image source={{ uri: image }} style={styles.uploadedImage} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.changeImageText}>Đổi ảnh</Text>
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={40} color="#999" />
              <Text style={styles.imagePlaceholderText}>Chọn ảnh</Text>
              <Text style={styles.imageHint}>Nhấn để chọn từ thư viện hoặc chụp ảnh</Text>
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
          maxLength={100}
        />
        <Text style={styles.charCount}>{dishName.length}/100</Text>
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
          maxLength={4}
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
          maxLength={500}
        />
        <Text style={styles.charCount}>{recipeDescription.length}/500</Text>
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nguyên liệu * ({ingredients.filter(i => i.trim()).length})</Text>
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
              maxLength={100}
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
          <Text style={styles.sectionTitle}>Hướng dẫn nấu * ({instructions.filter(i => i.trim()).length})</Text>
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
              maxLength={300}
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="white" size="small" />
            <Text style={styles.loadingText}>Đang tạo món ăn...</Text>
          </View>
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
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
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
    position: 'relative',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 16,
    marginTop: 8,
  },
  imageHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeImageText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
});