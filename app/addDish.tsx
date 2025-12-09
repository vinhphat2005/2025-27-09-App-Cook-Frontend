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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDifficultyDisplay, mapDifficultyToEnglish } from '@/types/dish';
import { isWeb } from '@/styles/responsive';
import { AppConfig } from '@/lib/config';

export default function AddDish() {
  const { user, token, requireAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [dishName, setDishName] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  
  // Recipe additional fields
  const [recipeDescription, setRecipeDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Dễ'); // Vietnamese display

  React.useEffect(() => {
    requireAuth();
  }, []);

  // ✅ Web-optimized image picker
  const pickImageWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Alert.alert('Lỗi', 'Kích thước ảnh không được vượt quá 5MB!');
        return;
      }

      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1]; // Remove data:image/...;base64, prefix
        
        setImage(base64String); // For preview
        setImageBase64(base64Data);
        setImageMime(file.type || 'image/jpeg');
        
        console.log('Image selected (web):', {
          name: file.name,
          type: file.type,
          size: file.size,
          base64Length: base64Data.length
        });
      };
      
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  // Enhanced image picker với compression tốt hơn
  const pickImageMobile = async () => {
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
      setImageBase64(selectedImage.base64 || null);
      setImageMime(selectedImage.mimeType || 'image/jpeg');
      
      // Log để debug
      console.log('Image selected (mobile):', {
        uri: selectedImage.uri,
        mimeType: selectedImage.mimeType,
        base64Length: selectedImage.base64?.length || 0
      });
    }
  };

  // ✅ Platform-aware image picker
  const pickImage = () => {
    if (Platform.OS === 'web') {
      pickImageWeb();
    } else {
      pickImageMobile();
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

      // ✅ FIXED: Use helper function to convert Vietnamese difficulty to English
      const englishDifficulty = mapDifficultyToEnglish(difficulty);
      
      console.log('🔍 Difficulty mapping:', {
        vietnamese: difficulty,
        english: englishDifficulty
      });

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
        difficulty: englishDifficulty, // ✅ FIXED: Now properly converted to English
        instructions: filteredInstructions,
      };

      console.log('Sending dish data:', {
        ...dishData,
        image_b64: `[base64 data - ${imageBase64?.length || 0} characters]` // Don't log full base64
      });

      const API_URL = AppConfig.api.url;
      
      if (!API_URL) {
        Alert.alert('Lỗi cấu hình', 'Thiếu cấu hình EXPO_PUBLIC_API_URL trong môi trường');
        return; 
      }

      console.log('📤 Sending request to:', `${API_URL}/dishes/with-recipe`);
      console.log('📤 With authorization token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${API_URL}/dishes/with-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dishData),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      const result = await response.json();
      console.log('📥 Response data:', result);
      
      if (response.ok) {
        console.log('✅ Dish created successfully!');
        
        // Reset form
        setDishName('');
        setCookingTime('');
        setIngredients(['']);
        setInstructions(['']);
        setImage(null);
        setImageBase64(null);
        setImageMime(null);
        setRecipeDescription('');
        setDifficulty('Dễ');
        
        // Show success message
        if (Platform.OS === 'web') {
          // On web, show alert and navigate immediately
          alert('✅ Thành công! Món ăn và công thức đã được tạo thành công!');
          router.replace('/(tabs)/profile');
        } else {
          // On mobile, use Alert with callback
          Alert.alert(
            'Thành công! 🎉', 
            'Món ăn và công thức đã được tạo thành công!',
            [
              { 
                text: 'Xem món ăn', 
                onPress: () => {
                  router.replace('/(tabs)/profile');
                }
              }
            ]
          );
        }
      } else {
        console.error('❌ Server error:', result);
        // Handle specific error cases
        let errorMessage = 'Có lỗi xảy ra!';
        
        if (response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';
        } else if (response.status === 413) {
          errorMessage = 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn!';
        } else if (response.status === 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau!';
        } else if (result.detail) {
          errorMessage = typeof result.detail === 'string' 
            ? result.detail 
            : JSON.stringify(result.detail);
        }
        
        Alert.alert('Lỗi', errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Create dish error:', error);
      
      let errorMessage = 'Không thể kết nối đến server!';
      
      if (error?.name === 'TypeError' && error?.message?.includes('Network request failed')) {
        errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet!';
      } else if (error?.name === 'TimeoutError') {
        errorMessage = 'Yêu cầu quá thời gian. Vui lòng thử lại!';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Lỗi kết nối', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Camera option (mobile only)
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
      setImageBase64(selectedImage.base64 || null);
      setImageMime(selectedImage.mimeType || 'image/jpeg');
    }
  };

  // Show image picker options
  const showImagePicker = () => {
    // ✅ On web, directly open file picker
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }

    // On mobile, show options for camera or library
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
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
                  <Text style={styles.imagePlaceholderText}>
                    {Platform.OS === 'web' ? 'Chọn ảnh từ máy tính' : 'Chọn ảnh'}
                  </Text>
                  <Text style={styles.imageHint}>
                    {Platform.OS === 'web' 
                      ? 'Nhấn để chọn file ảnh (JPG, PNG, tối đa 5MB)'
                      : 'Nhấn để chọn từ thư viện hoặc chụp ảnh'
                    }
                  </Text>
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
              returnKeyType="next"
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
              returnKeyType="next"
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
                  onPress={() => {
                    console.log('🔍 Difficulty selected:', level);
                    setDifficulty(level);
                  }}
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
            <Text style={styles.debugText}>Đã chọn: {difficulty} → {mapDifficultyToEnglish(difficulty)}</Text>
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
              returnKeyType="next"
              textAlignVertical="top"
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
                <View style={styles.ingredientNumber}>
                  <Text style={styles.ingredientNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder={`Nguyên liệu ${index + 1}...`}
                  value={ingredient}
                  onChangeText={(value) => updateIngredient(index, value)}
                  maxLength={100}
                  returnKeyType={index === ingredients.length - 1 ? "done" : "next"}
                  blurOnSubmit={false}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeIngredient(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash" size={18} color="#ff4444" />
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
              <View key={index} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.inputFlex, styles.instructionInput]}
                  placeholder={`Bước ${index + 1}...`}
                  value={instruction}
                  onChangeText={(value) => updateInstruction(index, value)}
                  multiline
                  maxLength={300}
                  returnKeyType="done"
                  textAlignVertical="top"
                />
                {instructions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeInstruction(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash" size={18} color="#ff4444" />
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

          {/* Bottom spacing for keyboard */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: isWeb ? 32 : 20,
    paddingBottom: 100,
    maxWidth: isWeb ? 800 : '100%',
    alignSelf: 'center' as const,
    width: '100%',
  },
  title: {
    fontSize: isWeb ? 32 : 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24, // Increased spacing
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    borderRadius: isWeb ? 12 : 8,
    padding: isWeb ? 14 : 12,
    fontSize: isWeb ? 16 : 16,
    minHeight: 44,
    ...(isWeb && {
      outlineStyle: 'none' as any,
    }),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  instructionInput: {
    minHeight: 60, // Taller for multi-line instructions
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 44,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inputFlex: {
    flex: 1,
  },
  ingredientNumber: {
    backgroundColor: '#f5b402',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ingredientNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  stepNumber: {
    backgroundColor: '#dc502e',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 12, // Align with text input
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  removeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 4, // Align better with input
  },
  imageUpload: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: isWeb ? '#007AFF' : '#ddd',
    borderStyle: 'dashed',
    borderRadius: isWeb ? 12 : 8,
    height: isWeb ? 250 : 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...(isWeb && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease',
    }),
  },
  imagePlaceholder: {
    alignItems: 'center',
    padding: isWeb ? 20 : 0,
  },
  imagePlaceholderText: {
    color: isWeb ? '#007AFF' : '#999',
    fontSize: isWeb ? 18 : 16,
    marginTop: 8,
    fontWeight: isWeb ? '600' : 'normal',
  },
  imageHint: {
    color: '#666',
    fontSize: isWeb ? 14 : 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: isWeb ? 20 : 0,
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
    minHeight: 44,
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
    borderRadius: isWeb ? 16 : 12,
    paddingVertical: isWeb ? 18 : 16,
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
    minHeight: isWeb ? 56 : 52,
    ...(isWeb && {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease',
    }),
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
    ...(isWeb && {
      cursor: 'not-allowed' as any,
    }),
  },
  createButtonText: {
    color: 'white',
    fontSize: isWeb ? 20 : 18,
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
  bottomSpacing: {
    height: 120, // Extra space for keyboard on iOS
  },
});