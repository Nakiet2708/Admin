import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, Image, ScrollView } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Provider, Portal, Dialog, Button } from 'react-native-paper';
import { app } from '../../config';

const TableDetails = ({ route, navigation }) => {
  const { restaurantId, tableId, restaurant } = route.params;
  const [tableName, setTableName] = useState('');
  const [tableImage, setTableImage] = useState('');
  const [tablePrice, setTablePrice] = useState('');
  const [options, setOptions] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState({ name: '', price: '' });
  const [imageUri, setImageUri] = useState('');
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [soHangMoiTrang] = useState(4);
  const db = getFirestore(app);
  const storage = getStorage(app);

  useEffect(() => {
    // Realtime listener cho table data
    const tableRef = doc(db, "restaurants", restaurantId, "table", tableId);
    const unsubscribeTable = onSnapshot(tableRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTableName(data.name || '');
        setTableImage(data.image || '');
        setTablePrice(data.price || '');
        setImageUri('');
      }
    });

    // Realtime listener cho options
    const optionsRef = collection(db, "restaurants", restaurantId, "table", tableId, "option");
    const unsubscribeOptions = onSnapshot(optionsRef, (snapshot) => {
      const optionsList = [];
      snapshot.forEach((doc) => {
        optionsList.push({ id: doc.id, ...doc.data() });
      });
      setOptions(optionsList);
    });

    // Cleanup function
    return () => {
      unsubscribeTable();
      unsubscribeOptions();
    };
  }, [restaurantId, tableId]);

  const handleImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const uri = response.assets[0].uri;
        setImageUri(uri);
      }
    });
  };

  const handleUpdateTable = async () => {
    try {
      const tableRef = doc(db, "restaurants", restaurantId, "table", tableId);

      let newImageUrl = tableImage;

      if (imageUri) {
        if (tableImage) {
          const oldImageRef = ref(storage, tableImage);
          await deleteObject(oldImageRef);
        }

        const imageName = `Table/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);

        newImageUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(tableRef, { 
        name: tableName, 
        image: newImageUrl,
        price: parseFloat(tablePrice)
      });

      setTableImage(newImageUrl);
      window.alert('Thành công: Đã cập nhật thông tin bảng');
    } catch (error) {
      console.error("Error updating table:", error);
      window.alert('Lỗi: Không thể cập nhật thông tin bảng');
    }
  };

  const handleDeleteOption = async (id) => {
    try {
      const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa option này không?');
      
      if (confirmDelete) {
        await deleteDoc(doc(db, "restaurants", restaurantId, "table", tableId, "option", id));
        setOptions(options.filter(option => option.id !== id));
        window.alert('Xóa option thành công!');
      }
    } catch (error) {
      window.alert("Lỗi: Không thể xóa option");
    }
  };

  const handleAddOrUpdateOption = async () => {
    try {
      // Kiểm tra các trường bắt buộc
      if (!selectedOption?.name?.trim()) {
        window.alert('Vui lòng nhập tên option');
        return;
      }

      if (!selectedOption?.price) {
        window.alert('Vui lòng nhập giá');
        return;
      }

      const optionsRef = collection(db, "restaurants", restaurantId, "table", tableId, "option");

      // Chuyển đổi price từ string sang number trước khi lưu
      const optionData = {
        name: selectedOption.name.trim(),
        price: parseFloat(selectedOption.price) || 0, // Đảm bảo giá trị là number
      };

      if (selectedOption.id) {
        const optionRef = doc(optionsRef, selectedOption.id);
        await updateDoc(optionRef, optionData);
        window.alert('Cập nhật option thành công!');
      } else {
        await addDoc(optionsRef, optionData);
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

  const doiTrang = (soTrang) => {
    setTrangHienTai(soTrang);
  };

  const viTriCuoiCung = trangHienTai * soHangMoiTrang;
  const viTriDauTien = viTriCuoiCung - soHangMoiTrang;
  const danhSachHienThi = options.slice(viTriDauTien, viTriCuoiCung);

  const showDialog = (option) => {
    setSelectedOption(option || { name: '', price: '' });
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
    setSelectedOption({ name: '', price: '' });
  };

  return (
    <Provider>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('RestaurantDetailsScreen', { 
              restaurantId: restaurantId,
              restaurant: restaurant
            })}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.header}>Chi tiết bảng: {tableName}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Tên bàn:</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên bàn"
              value={tableName}
              onChangeText={setTableName}
            />
            <Text style={styles.label}>Giá:</Text>
            <TextInput
              style={styles.input}
              placeholder="Giá"
              value={tablePrice.toString()}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, '');
                setTablePrice(numericValue);
              }}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.imageColumn}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Image source={{ uri: tableImage }} style={styles.image} />
            )}
            <TouchableOpacity onPress={handleImagePicker} style={styles.imageButton}>
              <Text style={styles.imageButtonText}>Chọn Hình Ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateTable}>
          <Text style={styles.submitButtonText}>Cập Nhật Bảng</Text>
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
                  keyboardType="number-pad"
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
  container: {
    flex: 1,
    padding: 16,
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
});

export default TableDetails;
