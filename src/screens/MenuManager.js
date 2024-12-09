import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { Provider, Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { app } from '../../config';
import { getStorage } from 'firebase/storage';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';

const MenuManager = ({ navigation }) => {
  const [menus, setMenus] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newMenu, setNewMenu] = useState({
    name: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const db = getFirestore(app);
  const storage = getStorage(app);

  useEffect(() => {
    const menusRef = collection(db, "menu");
    const unsubscribe = onSnapshot(menusRef, (snapshot) => {
      try {
        const menuList = [];
        snapshot.forEach((doc) => {
          menuList.push({ id: doc.id, ...doc.data() });
        });
        // Sắp xếp menu theo tên
        const sortedMenus = menuList.sort((a, b) => 
          a.name.localeCompare(b.name, 'vi', { numeric: true })
        );
        setMenus(sortedMenus);
      } catch (error) {
        console.error("Lỗi khi tải danh sách:", error);
        window.alert("Không thể tải danh sách menu");
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    try {
      // 1. Xóa tất cả options của mỗi product
      const productsRef = collection(db, "menu", selectedId, "product");
      const productsSnapshot = await getDocs(productsRef);
      
      for (const productDoc of productsSnapshot.docs) {
        // Xóa tất cả options của product
        const optionsRef = collection(db, "menu", selectedId, "product", productDoc.id, "option");
        const optionsSnapshot = await getDocs(optionsRef);
        
        for (const optionDoc of optionsSnapshot.docs) {
          await deleteDoc(optionDoc.ref);
        }

        // Xóa ảnh của product nếu có
        const productData = productDoc.data();
        if (productData.image) {
          try {
            const productImageRef = ref(storage, productData.image);
            await deleteObject(productImageRef);
          } catch (error) {
            console.error("Lỗi khi xóa ảnh product:", error);
          }
        }
        
        // Xóa product
        await deleteDoc(productDoc.ref);
      }

      // 2. Xóa ảnh của menu nếu có
      const menuDoc = await getDoc(doc(db, "menu", selectedId));
      const menuData = menuDoc.data();
      if (menuData.image) {
        try {
          const menuImageRef = ref(storage, menuData.image);
          await deleteObject(menuImageRef);
        } catch (error) {
          console.error("Lỗi khi xóa ảnh menu:", error);
        }
      }

      // 3. Xóa menu
      await deleteDoc(doc(db, "menu", selectedId));
      setVisible(false);
      window.alert("Xóa menu thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      window.alert("Không thể xóa menu");
    }
  };

  const handleImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.error) {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const handleAddMenu = async () => {
    try {
      if (!newMenu.name.trim()) {
        window.alert('Vui lòng nhập tên menu');
        return;
      }
      if (!selectedImage) {
        window.alert('Vui lòng chọn hình ảnh');
        return;
      }

      let imageUrl = '';
      if (selectedImage) {
        const imageName = `AnhTheLoai/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "menu"), {
        name: newMenu.name.trim(),
        image: imageUrl
      });

      setAddDialogVisible(false);
      setNewMenu({ name: '' });
      setSelectedImage(null);
      window.alert('Thêm menu thành công!');
    } catch (error) {
      console.error("Error adding menu:", error);
      window.alert('Không thể thêm menu');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.menuItem}>
      <Image 
        source={{ uri: (item.image) }} 
        style={styles.menuImage} 
      />
      <View style={styles.menuContent}>
        <Text style={styles.menuName}>{item.name}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.editButton]}
            onPress={() => {
              navigation.navigate('MenuDetailsScreen', { 
                menuId: item.id,
                menu: item 
              });
            }}
          >
            <Text style={styles.buttonText}>Chỉnh sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.deleteButton]}
            onPress={() => {
              setSelectedId(item.id);
              setVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Hàm lọc danh sách menu
  const getFilteredMenus = () => {
    if (!searchQuery.trim()) {
      return menus;
    }
    
    const searchLower = searchQuery.toLowerCase().trim();
    return menus.filter(menu =>
      menu.name?.toLowerCase().includes(searchLower)
    );
  };

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên menu..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setAddDialogVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Thêm Menu Mới</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={getFilteredMenus()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy menu phù hợp' : 'Chưa có menu nào'}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery ? '' : 'Hãy thêm menu mới để bắt đầu'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />

        {/* Dialog xác nhận xóa */}
        <Portal>
          <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.deleteDialog}>
            <Dialog.Title style={styles.deleteDialogTitle}>Xác nhận xóa</Dialog.Title>
            <Dialog.Content>
              <Paragraph style={styles.deleteDialogContent}>Bạn có chắc muốn xóa menu này?</Paragraph>
            </Dialog.Content>
            <Dialog.Actions style={styles.deleteDialogActions}>
              <Button onPress={() => setVisible(false)} textColor="#007BFF">Hủy</Button>
              <Button onPress={handleDelete} textColor="#007BFF">Xóa</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Dialog thêm menu mới */}
        <Portal>
          <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)} style={styles.dialog}>
            <Dialog.Title style={styles.dialogTitle}>Thêm Menu Mới</Dialog.Title>
            <Dialog.Content>
              <View style={styles.dialogContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tên menu <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.dialogInput}
                    value={newMenu.name}
                    onChangeText={(text) => setNewMenu({ ...newMenu, name: text })}
                    placeholder="Nhập tên menu"
                  />
                </View>
                
                <View style={styles.imageContainer}>
                  <Text style={styles.label}>Hình ảnh <Text style={styles.required}>*</Text></Text>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder} />
                  )}
                  <TouchableOpacity onPress={handleImagePicker} style={styles.imagePickerButton}>
                    <Text style={styles.imagePickerButtonText}>Chọn Hình Ảnh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <Button onPress={() => setAddDialogVisible(false)} textColor="#007BFF">Hủy</Button>
              <Button onPress={handleAddMenu} textColor="#007BFF">Thêm</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  listContainer: {
    paddingBottom: 20,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    flexDirection: 'row',
  },
  menuImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  menuContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  menuName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 8,
  },
  required: {
    color: '#FF5252',
  },
  previewImage: {
    width: '100%',
    height: 200,
    marginVertical: 12,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imagePickerButton: {
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteDialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxWidth: 300,
    alignSelf: 'center',
  },
  deleteDialogTitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#000',
  },
  deleteDialogContent: {
    textAlign: 'center',
    color: '#000',
  },
  deleteDialogActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 15,
    paddingBottom: 8,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  dialogContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'white',
  },
  inputContainer: {
    flex: 1,
    marginRight: 16,
  },
  imageContainer: {
    width: 150,
    alignItems: 'center',
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 3,
    backgroundColor: 'white',
    color: '#000',
  },
  label: {
    fontSize: 14,
    marginBottom: 1,
    color: '#333',
  },
  required: {
    color: 'red',
    fontSize: 14,
  },
  previewImage: {
    width: 150,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
    borderRadius: 5,
  },
  imagePickerButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 14,
  },
  dialogActions: {
    padding: 15,
    justifyContent: 'flex-end',
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 4,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
});

export default MenuManager;