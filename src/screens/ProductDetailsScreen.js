import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, Image, ScrollView } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Provider, Portal, Dialog, Button } from 'react-native-paper';
import { app } from '../../config';

const ProductDetailsScreen = ({ route, navigation }) => {
  const { menuId, productId, menu } = route.params;
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescribe, setProductDescribe] = useState('');
  const [productDiscountPrice, setProductDiscountPrice] = useState('');
  const [productStatus, setProductStatus] = useState(true);
  const [options, setOptions] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState({ name: '', price: '' });
  const [imageUri, setImageUri] = useState('');
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [soHangMoiTrang] = useState(4);
  const db = getFirestore(app);
  const storage = getStorage(app);

  useEffect(() => {
    const loadProductData = async () => {
      try {
        const productRef = doc(db, "menu", menuId, "product", productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          setProductName(data.name || '');
          setProductImage(data.image || '');
          setProductPrice(data.price || '');
          setProductDescribe(data.describe || '');
          setProductDiscountPrice(data.discountPrice || '');
          setProductStatus(data.status ?? true);
          setImageUri('');
        }
      } catch (error) {
        console.error("Error loading product:", error);
        window.alert("Lỗi: Không thể tải thông tin sản phẩm");
      }
    };

    const loadOptions = async () => {
      try {
        const optionsRef = collection(db, "menu", menuId, "product", productId, "option");
        const optionsSnap = await getDocs(optionsRef);
        const optionsList = [];
        optionsSnap.forEach((doc) => {
          optionsList.push({ id: doc.id, ...doc.data() });
        });
        setOptions(optionsList);
      } catch (error) {
        console.error("Error loading options:", error);
        window.alert("Lỗi: Không thể tải danh sách option");
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      loadProductData();
      loadOptions();
    });

    return unsubscribe;
  }, [navigation, menuId, productId]);

  useEffect(() => {
    setProductStatus(productDiscountPrice ? "Khuyến mãi" : "");
  }, [productDiscountPrice]);

  const handleImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.error) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const handleUpdateProduct = async () => {
    try {
      if (!productName.trim()) {
        window.alert('Vui lòng nhập tên sản phẩm');
        return;
      }

      if (!productPrice) {
        window.alert('Vui lòng nhập giá sản phẩm');
        return;
      }

      const productRef = doc(db, "menu", menuId, "product", productId);
      let newImageUrl = productImage;

      if (imageUri) {
        if (productImage) {
          const oldImageRef = ref(storage, productImage);
          await deleteObject(oldImageRef);
        }

        const imageName = `Product/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        newImageUrl = await getDownloadURL(imageRef);
      }

      const status = productDiscountPrice ? "Khuyến mãi" : "";

      await updateDoc(productRef, {
        name: productName.trim(),
        image: newImageUrl,
        price: parseFloat(productPrice),
        describe: productDescribe,
        discountPrice: productDiscountPrice ? parseFloat(productDiscountPrice) : null,
        status: status
      });

      setProductImage(newImageUrl);
      window.alert('Cập nhật sản phẩm thành công!');
    } catch (error) {
      console.error("Error updating product:", error);
      window.alert('Lỗi: Không thể cập nhật sản phẩm');
    }
  };

  const handleDeleteOption = async (id) => {
    try {
      const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa option này không?');
      
      if (confirmDelete) {
        await deleteDoc(doc(db, "menu", menuId, "product", productId, "option", id));
        setOptions(options.filter(option => option.id !== id));
        window.alert('Xóa option thành công!');
      }
    } catch (error) {
      window.alert("Lỗi: Không thể xóa option");
    }
  };

  const handleAddOrUpdateOption = async () => {
    try {
      if (!selectedOption?.name?.trim()) {
        window.alert('Vui lòng nhập tên option');
        return;
      }

      if (!selectedOption?.price) {
        window.alert('Vui lòng nhập giá');
        return;
      }

      const optionsRef = collection(db, "menu", menuId, "product", productId, "option");

      if (selectedOption.id) {
        const optionRef = doc(optionsRef, selectedOption.id);
        await updateDoc(optionRef, {
          name: selectedOption.name.trim(),
          price: parseFloat(selectedOption.price),
        });
        window.alert('Cập nhật option thành công!');
      } else {
        await addDoc(optionsRef, {
          name: selectedOption.name.trim(),
          price: parseFloat(selectedOption.price),
        });
        window.alert('Thêm option mới thành công!');
      }

      hideDialog();
      const optionsSnap = await getDocs(optionsRef);
      const optionsList = [];
      optionsSnap.forEach((doc) => {
        optionsList.push({ id: doc.id, ...doc.data() });
      });
      setOptions(optionsList);
    } catch (error) {
      console.error("Error:", error);
      window.alert("Lỗi: Không thể thêm hoặc cập nhật option");
    }
  };

  // Các hàm phụ trợ
  const doiTrang = (soTrang) => setTrangHienTai(soTrang);
  const showDialog = (option) => {
    setSelectedOption(option || { name: '', price: '' });
    setVisible(true);
  };
  const hideDialog = () => {
    setVisible(false);
    setSelectedOption({ name: '', price: '' });
  };

  const viTriCuoiCung = trangHienTai * soHangMoiTrang;
  const viTriDauTien = viTriCuoiCung - soHangMoiTrang;
  const danhSachHienThi = options.slice(viTriDauTien, viTriCuoiCung);

  useEffect(() => {
    const productRef = doc(db, "menu", menuId, "product", productId);
    const unsubscribeProduct = onSnapshot(productRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProductName(data.name || '');
        setProductImage(data.image || '');
        setProductPrice(data.price || '');
        setProductDescribe(data.describe || '');
        setProductDiscountPrice(data.discountPrice || '');
        setProductStatus(data.status ?? true);
        setImageUri('');
      }
    });

    const optionsRef = collection(db, "menu", menuId, "product", productId, "option");
    const unsubscribeOptions = onSnapshot(optionsRef, (snapshot) => {
      const optionsList = [];
      snapshot.forEach((doc) => {
        optionsList.push({ id: doc.id, ...doc.data() });
      });
      setOptions(optionsList);
    });

    return () => {
      unsubscribeProduct();
      unsubscribeOptions();
    };
  }, [menuId, productId]);

  return (
    <Provider>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('MenuDetailsScreen', { 
              menuId: menuId,
              menu: menu
            })}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.header}>Chi tiết sản phẩm: {productName}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Tên sản phẩm:</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên sản phẩm"
              value={productName}
              onChangeText={setProductName}
            />
            <Text style={styles.label}>Mô tả:</Text>
            <TextInput
              style={styles.input}
              placeholder="Mô tả sản phẩm"
              value={productDescribe}
              onChangeText={setProductDescribe}
              multiline
            />
            <Text style={styles.label}>Giá:</Text>
            <TextInput
              style={styles.input}
              placeholder="Giá"
              value={productPrice}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, '');
                setProductPrice(numericValue);
              }}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Giá khuyến mãi:</Text>
            <TextInput
              style={styles.input}
              placeholder="Giá khuyến mãi"
              value={productDiscountPrice}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, '');
                setProductDiscountPrice(numericValue);
              }}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Trạng thái:</Text>
            <Text style={styles.statusText}>
              {productStatus || 'Bình thường'}
            </Text>
          </View>
          <View style={styles.imageColumn}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Image source={{ uri: productImage }} style={styles.image} />
            )}
            <TouchableOpacity onPress={handleImagePicker} style={styles.imageButton}>
              <Text style={styles.imageButtonText}>Chọn Hình Ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateProduct}>
          <Text style={styles.submitButtonText}>Cập Nhật Sản Phẩm</Text>
        </TouchableOpacity>

        <Text style={styles.header}>Danh sách option</Text>
        <TouchableOpacity onPress={() => showDialog()} style={styles.addButton}>
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>

        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>Tên</Text>
          <Text style={styles.headerCell}>Giá</Text>
          <Text style={styles.headerCell}>Chức năng</Text>
        </View>

        <FlatList
          data={danhSachHienThi}
          renderItem={({ item }) => (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.name}</Text>
              <Text style={styles.tableCell}>{item.price}</Text>
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity onPress={() => showDialog(item)} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteOption(item.id)} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />

        <View style={styles.phanTrangContainer}>
          {Array.from({ length: Math.ceil(options.length / soHangMoiTrang) }).map((_, index) => (
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
            <Dialog.Title style={styles.dialogTitle}>
              {selectedOption.id ? 'Sửa option' : 'Thêm option'}
            </Dialog.Title>
            <Dialog.Content>
              <View style={styles.dialogContent}>
                <Text style={styles.label}>Tên option <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tên option"
                  value={selectedOption.name}
                  onChangeText={(text) => setSelectedOption({ ...selectedOption, name: text })}
                />
                <Text style={styles.label}>Giá <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Giá"
                  value={selectedOption.price.toString()}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setSelectedOption({ ...selectedOption, price: numericValue });
                  }}
                  keyboardType="numeric"
                />
              </View>
            </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <Button onPress={hideDialog}>Hủy</Button>
              <Button onPress={handleAddOrUpdateOption}>
                {selectedOption.id ? 'Cập nhật' : 'Thêm'}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  // Sử dụng lại toàn bộ styles từ TableDetails
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
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    color: '#007BFF',
    fontSize: 16,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  column: {
    flex: 1,
    marginRight: 20,
  },
  imageColumn: {
    width: 200,
    alignItems: 'center',
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
    marginBottom: 16,
    backgroundColor: 'white',
  },
  image: {
    width: 200,
    height: 150,
    marginBottom: 10,
    borderRadius: 5,
  },
  imageButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  imageButtonText: {
    color: 'white',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: 100,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 5,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 10,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#007BFF',
    padding: 5,
    borderRadius: 5,
    width: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
  },
  phanTrangContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
  dialogTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',

  },
  dialogContent: {
    paddingHorizontal: 20,
  },
  dialogActions: {
    padding: 15,
    justifyContent: 'flex-end',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic'
  },
});

export default ProductDetailsScreen; 