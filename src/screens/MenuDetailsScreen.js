import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, Image, ScrollView } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Provider, Portal, Dialog, Button } from 'react-native-paper';
import { app } from '../../config';

const MenuDetailsScreen = ({ route, navigation }) => {
  const { menuId, menu } = route.params;
  const [menuName, setMenuName] = useState('');
  const [menuImage, setMenuImage] = useState('');
  const [products, setProducts] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState({
    name: '',
    describe: '',
    price: '',
    discountPrice: '',
    status: '',
    image: ''
  });
  const [imageUri, setImageUri] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [soHangMoiTrang] = useState(4);
  
  const db = getFirestore(app);
  const storage = getStorage(app);

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const menuRef = doc(db, "menu", menuId);
        const menuSnap = await getDoc(menuRef);
        if (menuSnap.exists()) {
          const menuData = menuSnap.data();
          setMenuName(menuData.name);
          setMenuImage(menuData.image);
        }
        await fetchProducts();
      } catch (error) {
        console.error("Error loading menu:", error);
        alert("Không thể tải thông tin menu");
      }
    };

    loadMenuData();
  }, [menuId]);

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, "menu", menuId, "product");
      const querySnapshot = await getDocs(productsRef);
      const productList = [];
      querySnapshot.forEach((doc) => {
        productList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      alert("Không thể tải danh sách sản phẩm");
    }
  };

  const handleImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const uri = response.assets[0].uri;
        console.log('Selected Image URI:', uri);
        setImageUri(uri);
      }
    });
  };

  const handleUpdateMenu = async () => {
    try {
      if (!menuName.trim()) {
        window.alert('Vui lòng nhập tên menu');
        return;
      }

      const menuRef = doc(db, "menu", menuId);
      let updateData = {
        name: menuName.trim()
      };

      // Chỉ cập nhật ảnh nếu có chọn ảnh mới
      if (imageUri) {
        if (menuImage) {
          // Xóa ảnh cũ nếu có
          try {
            const oldImageRef = ref(storage, menuImage);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error("Error deleting old image:", error);
          }
        }

        // Upload ảnh mới
        const imageName = `Menu/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        const newImageUrl = await getDownloadURL(imageRef);
        
        // Thêm URL ảnh mới vào dữ liệu cập nhật
        updateData.image = newImageUrl;
        setMenuImage(newImageUrl);
      }

      // Cập nhật menu với dữ liệu mới
      await updateDoc(menuRef, updateData);
      
      window.alert('Cập nhật menu thành công!');
      setImageUri(''); // Reset imageUri sau khi cập nhật
    } catch (error) {
      console.error("Error updating menu:", error);
      window.alert('Lỗi: Không thể cập nhật menu');
    }
  };

  const handleProductImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.error) {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const handleAddOrUpdateProduct = async () => {
    try {
      if (!selectedProduct?.name?.trim()) {
        window.alert('Vui lòng nhập tên sản phẩm');
        return;
      }
      if (!selectedProduct?.describe?.trim()) {
        window.alert('Vui lòng nhập mô tả');
        return;
      }
      if (!selectedProduct?.price || isNaN(Number(selectedProduct.price))) {
        window.alert('Vui lòng nhập giá hợp lệ (phải là số)');
        return;
      }
      if (!selectedImage && !selectedProduct.id) {
        window.alert('Vui lòng chọn hình ảnh');
        return;
      }

      let imageUrl = selectedProduct.image || '';

      if (selectedImage) {
        if (selectedProduct.image) {
          const oldImageRef = ref(storage, selectedProduct.image);
          await deleteObject(oldImageRef);
        }

        const imageName = `Product/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      const productData = {
        name: selectedProduct.name.trim(),
        describe: selectedProduct.describe.trim(),
        price: Number(selectedProduct.price),
        discountPrice: selectedProduct.discountPrice ? Number(selectedProduct.discountPrice) : '',
        status: selectedProduct.status || '',
        image: imageUrl
      };

      if (selectedProduct.id) {
        await updateDoc(doc(db, "menu", menuId, "product", selectedProduct.id), productData);
        window.alert('Cập nhật sản phẩm thành công!');
      } else {
        await addDoc(collection(db, "menu", menuId, "product"), productData);
        window.alert('Thêm sản phẩm thành công!');
      }

      hideDialog();
      const productsSnap = await getDocs(collection(db, "menu", menuId, "product"));
      const productsList = [];
      productsSnap.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error:", error);
      window.alert('Lỗi: Không thể thêm hoặc cập nhật sản phẩm');
    }
  };


  const hideDialog = () => {
    setVisible(false);
    setSelectedProduct(null);
    setSelectedImage(null);
  };

  const doiTrang = (soTrang) => {
    setTrangHienTai(soTrang);
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={styles.tableCell}>{item.name}</Text>
      <View style={styles.tableImageContainer}>
        <Image source={{ uri: item.image }} style={styles.tableImage} />
      </View>
      <Text style={styles.tableCell}>{item.price}</Text>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ProductDetailsScreen', {
            productId: item.id,
            menuId: menuId,
            menu: menu
          })}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteProduct(item.id)} 
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const viTriCuoiCung = trangHienTai * soHangMoiTrang;
  const viTriDauTien = viTriCuoiCung - soHangMoiTrang;
  const danhSachHienThi = products.slice(viTriDauTien, viTriCuoiCung);

  useEffect(() => {
    if (!selectedProduct) return;

    const newStatus = selectedProduct.discountPrice && 
                     selectedProduct.discountPrice.toString().trim() !== '' 
                     ? 'Khuyến mãi' 
                     : '';
    
    setSelectedProduct(prev => ({
      ...prev,
      status: newStatus
    }));
  }, [selectedProduct?.discountPrice]);


  const showDialog = () => {
    setSelectedProduct({
      name: '',
      describe: '',
      price: '',
      discountPrice: '',
      status: '',
      image: ''
    });
    setVisible(true);
    setSelectedImage(null);
  };

  const handleDeleteProduct = async (productId) => {
    try {
      if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
        return;
      }

      // Lấy thông tin sản phẩm trước khi xóa
      const productRef = doc(db, "menu", menuId, "product", productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const productData = productSnap.data();
        
        // 1. Xóa tất cả options của sản phẩm
        const optionsRef = collection(db, "menu", menuId, "product", productId, "option");
        const optionsSnapshot = await getDocs(optionsRef);
        const deleteOptionPromises = optionsSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deleteOptionPromises);

        // 2. Xóa ảnh từ storage nếu có
        if (productData.image) {
          try {
            const imageRef = ref(storage, productData.image);
            await deleteObject(imageRef);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }

        // 3. Xóa sản phẩm từ Firestore
        await deleteDoc(productRef);

        // 4. Cập nhật lại danh sách sản phẩm
        const updatedProducts = products.filter(product => product.id !== productId);
        setProducts(updatedProducts);

        window.alert('Xóa sản phẩm thành công!');
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      window.alert('Không thể xóa sản phẩm');
    }
  };

  useEffect(() => {
    // Realtime listener cho menu data
    const menuRef = doc(db, "menu", menuId);
    const unsubscribeMenu = onSnapshot(menuRef, (doc) => {
      if (doc.exists()) {
        const menuData = doc.data();
        setMenuName(menuData.name || '');
        setMenuImage(menuData.image || '');
      }
    });

    // Realtime listener cho products
    const productsRef = collection(db, "menu", menuId, "product");
    const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      const productsList = [];
      snapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      // Sắp xếp products theo tên
      const sortedProducts = productsList.sort((a, b) => 
        a.name.localeCompare(b.name, 'vi', { numeric: true })
      );
      setProducts(sortedProducts);
    });

    // Cleanup function
    return () => {
      unsubscribeMenu();
      unsubscribeProducts();
    };
  }, [menuId]);

  return (
    <Provider>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.header}>Chỉnh sửa menu: {menuName}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Tên menu:</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên menu"
              value={menuName}
              onChangeText={setMenuName}
            />
          </View>

          <View style={styles.imageColumn}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Image source={{ uri: menuImage }} style={styles.image} />
            )}
            <TouchableOpacity onPress={handleImagePicker} style={styles.imageButton}>
              <Text style={styles.imageButtonText}>Chọn Hình Ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateMenu}>
          <Text style={styles.submitButtonText}>Cập Nhật Menu</Text>
        </TouchableOpacity>

        <Text style={styles.header}>Danh sách sản phẩm</Text>
        <TouchableOpacity 
          onPress={showDialog} 
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>

        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>Tên</Text>
          <Text style={styles.headerCell}>Hình ảnh</Text>
          <Text style={styles.headerCell}>Giá</Text>
          <Text style={styles.headerCell}>Chức năng</Text>
        </View>

        <FlatList
          data={danhSachHienThi}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
        />

        <View style={styles.phanTrangContainer}>
          {Array.from({ length: Math.ceil(products.length / soHangMoiTrang) }).map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.nutTrang,
                trangHienTai === index + 1 && styles.nutTrangDangChon
              ]}
              onPress={() => doiTrang(index + 1)}
            >
              <Text style={[
                styles.chuNutTrang,
                trangHienTai === index + 1 && styles.chuNutTrangDangChon
              ]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Portal>
          <Dialog visible={visible} onDismiss={hideDialog} style={styles.dialog}>
            <Dialog.Title style={styles.dialogTitle}>Thêm sản phẩm mới</Dialog.Title>
            <Dialog.Content>
              <View style={styles.dialogContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tên sản phẩm <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProduct?.name || ''}
                    onChangeText={(text) => setSelectedProduct(prev => ({...prev, name: text}))}
                    placeholder="Tên sản phẩm"
                  />

                  <Text style={styles.label}>Mô tả</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProduct?.describe || ''}
                    onChangeText={(text) => setSelectedProduct(prev => ({...prev, describe: text}))}
                    placeholder="Mô tả sản phẩm"
                    multiline
                  />

                  <Text style={styles.label}>Giá <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProduct?.price?.toString() || ''}
                    onChangeText={(text) => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setSelectedProduct(prev => ({...prev, price: text}))
                      }
                    }}
                    placeholder="Giá sản phẩm"
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Giá khuyến mãi</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedProduct?.discountPrice?.toString() || ''}
                    onChangeText={(text) => setSelectedProduct(prev => ({...prev, discountPrice: text}))}
                    placeholder="Giá khuyến mãi"
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Trạng thái:</Text>
                  <Text style={styles.statusText}>
                    {selectedProduct?.status || 'Bình thường'}
                  </Text>
                </View>

                <View style={styles.imageContainer}>
                  <Text style={styles.label}>Hình ảnh <Text style={styles.required}>*</Text></Text>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  ) : selectedProduct?.image ? (
                    <Image source={{ uri: selectedProduct.image }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder} />
                  )}
                  <TouchableOpacity onPress={handleProductImagePicker} style={styles.imagePickerButton}>
                    <Text style={styles.imagePickerButtonText}>Chọn Hình Ảnh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={hideDialog}>Hủy</Button>
              <Button onPress={handleAddOrUpdateProduct}>Thêm</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    position: 'relative',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  column: {
    flex: 2,
    marginRight: 10,
  },
  imageColumn: {
    flex: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 5,
  },
  imageButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  tableImage: {
    width: 100,
    height: 60,
    resizeMode: 'contain',
  },
  previewImage: {
    width: 150,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
    borderRadius: 5,
  },
  imagePlaceholder: {
    width: 150,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 10,
  },
  imageContainer: {
    width: 150,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    padding: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
    width: 150,
  },
  addButton: {
    backgroundColor: '#28A745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
    marginBottom: 10,
    width: 60,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  imagePickerButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    color: '#007BFF',
    fontSize: 18,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
  },
  tableImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
  },
  phanTrangContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  nutTrang: {
    padding: 8,
    marginHorizontal: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#007BFF',
    minWidth: 35,
    alignItems: 'center',
  },
  nutTrangDangChon: {
    backgroundColor: '#007BFF',
  },
  chuNutTrang: {
    color: '#007BFF',
  },
  chuNutTrangDangChon: {
    color: 'white',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  dialogContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'white',
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  dialogActions: {
    padding: 15,
    justifyContent: 'flex-end',
  },
  inputContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  required: {
    color: 'red',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'white',
    color: '#000',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MenuDetailsScreen;