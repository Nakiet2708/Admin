import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { Provider, Portal, Dialog, Button } from 'react-native-paper';
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
      fetchMenus();
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
      fetchMenus();
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

  return (
    <Provider>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setAddDialogVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Thêm Menu Mới</Text>
        </TouchableOpacity>

        <FlatList
          data={menus}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có menu nào</Text>
              <Text style={styles.emptySubText}>Hãy thêm menu mới để bắt đầu</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />

        {/* Dialog xác nhận xóa */}
        <Portal>
          <Dialog visible={visible} onDismiss={() => setVisible(false)}>
            <Dialog.Title>Xác nhận xóa</Dialog.Title>
            <Dialog.Content>
              <Text>Bạn có chắc muốn xóa menu này?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setVisible(false)}>Hủy</Button>
              <Button onPress={handleDelete}>Xóa</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Dialog thêm menu mới */}
        <Portal>
          <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
            <Dialog.Title>Thêm Menu Mới</Dialog.Title>
            <Dialog.Content>
              <Text style={styles.label}>Tên menu <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={newMenu.name}
                onChangeText={(text) => setNewMenu({ ...newMenu, name: text })}
                placeholder="Nhập tên menu"
              />
              
              <Text style={styles.label}>Hình ảnh <Text style={styles.required}>*</Text></Text>
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              )}
              <TouchableOpacity onPress={handleImagePicker} style={styles.imagePickerButton}>
                <Text style={styles.imagePickerButtonText}>Chọn Hình Ảnh</Text>
              </TouchableOpacity>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAddDialogVisible(false)}>Hủy</Button>
              <Button onPress={handleAddMenu}>Thêm</Button>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 20,
    textAlign: 'center',
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
    marginBottom: 20,
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
});

export default MenuManager;