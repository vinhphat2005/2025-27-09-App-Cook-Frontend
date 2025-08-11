import { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function SearchBox() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
  if (!searchQuery.trim()) {
    alert("Vui lòng nhập nguyên liệu để tìm kiếm");
    return;
  }

  setIsLoading(true);
  try {
    const ingredients = searchQuery
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    console.log("🔍 Searching for ingredients:", ingredients);

    let response, data;

    // Nếu có nhiều ingredients → dùng GET với query params
    if (ingredients.length > 1) {
      const ingredientsParam = encodeURIComponent(ingredients.join(','));
      response = await fetch(`${API_URL}/search/dishes-by-ingredients?ingredients=${ingredientsParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Nếu 1 từ khóa → dùng search tổng hợp
      response = await fetch(`${API_URL}/search/all?q=${encodeURIComponent(searchQuery.trim())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (response.ok) {
      data = await response.json();
      console.log("✅ Search results:", data);
      
      router.push({
        pathname: "/search-results",
        params: { 
          query: searchQuery,
          results: JSON.stringify(data),
          searchType: ingredients.length > 1 ? "multi-ingredients" : "general"
        }
      });
    } else {
      const errorText = await response.text();
      console.error("❌ API Error:", response.status, errorText);
      alert(`Lỗi API: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Search error:", error);
    alert("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <>
      <TextInput 
        multiline 
        numberOfLines={4} 
        style={styles.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Nhập nguyên liệu cách nhau bằng dấu phẩy: thịt bò, cà rốt, khoai tây..."
        placeholderTextColor="#666"
      />

      <View style={styles.buttonContainer}>
        <View style={styles.searchButton}>
          <Button 
            color="black" 
            title={isLoading ? "Đang tìm..." : "Tìm kiếm"} 
            onPress={handleSearch}
            disabled={isLoading}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    height: 80,
    textAlignVertical: 'top'
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#f5a002",
    fontWeight: "bold",
    color: "white",
    borderRadius: 10,
    paddingLeft: 20,
    paddingRight: 20
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: 15
  }
});