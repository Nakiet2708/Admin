import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, Image, ScrollView } from 'react-native';
import { getFirestore, doc, updateDoc, getDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { app } from '../../config';
import { Provider, Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RestaurantDetails = ({ route, navigation }) => {
  const { restaurantId, restaurant } = route.params;
  const [restaurantName, setRestaurantName] = useState('');
  const [describe, setDescribe] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [images, setImages] = useState('');
  const [tables, setTables] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [imageUri, setImageUri] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [soHangMoiTrang] = useState(4);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const [selectedImage, setSelectedImage] = useState(null);
  const [mapPosition, setMapPosition] = useState([10.8231, 106.6297]); // Default: TP.HCM

  useEffect(() => {
    // Realtime listener cho restaurant data
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const unsubscribeRestaurant = onSnapshot(restaurantRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRestaurantName(data.restaurantName || '');
        setDescribe(data.describe || '');
        setBusinessAddress(data.businessAddress || '');
        setImages(data.images || '');
        setLatitude(data.latitude || '');
        setLongitude(data.longitude || '');
        if (data.latitude && data.longitude) {
          setMapPosition([parseFloat(data.latitude), parseFloat(data.longitude)]);
        }
        setImageUri('');
      }
    });

    // Realtime listener cho tables
    const tablesRef = collection(db, "restaurants", restaurantId, "table");
    const unsubscribeTables = onSnapshot(tablesRef, (snapshot) => {
      const tablesList = [];
      snapshot.forEach((doc) => {
        tablesList.push({ id: doc.id, ...doc.data() });
      });
      
      // Sắp xếp tables theo name
      const sortedTables = tablesList.sort((a, b) => 
        a.name.localeCompare(b.name, 'vi', { numeric: true })
      );
      
      setTables(sortedTables);
    });

    // Cleanup function
    return () => {
      unsubscribeRestaurant();
      unsubscribeTables();
    };
  }, [restaurantId]);

  const handleDeleteTable = async (id) => {
    try {
      // Tìm thông tin phòng cần xóa để lấy URL hình ảnh
      const tableToDelete = tables.find(table => table.id === id);
      
      // Hiển thị dialog xác nhận xóa
      const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa phòng này không?');
      
      if (confirmDelete) {
        // 1. Xóa tất cả option của phòng
        const optionsRef = collection(db, "restaurants", restaurantId, "table", id, "option");
        const optionsSnapshot = await getDocs(optionsRef);
        
        // Xóa từng option
        const optionDeletePromises = optionsSnapshot.docs.map(async (doc) => {
          // Xóa hình ảnh của option nếu có
          const optionData = doc.data();
          if (optionData.image) {
            try {
              const optionImageRef = ref(storage, optionData.image);
              await deleteObject(optionImageRef);
            } catch (error) {
              console.error("Error deleting option image:", error);
            }
          }
          // Xóa document của option
          return deleteDoc(doc.ref);
        });
        
        // Đợi tất cả option được xóa
        await Promise.all(optionDeletePromises);

        // 2. Xóa hình ảnh của phòng từ Storage nếu có
        if (tableToDelete.image) {
          try {
            const tableImageRef = ref(storage, tableToDelete.image);
            await deleteObject(tableImageRef);
          } catch (error) {
            console.error("Error deleting table image from storage:", error);
          }
        }

        // 3. Xóa document của phòng từ Firestore
        await deleteDoc(doc(db, "restaurants", restaurantId, "table", id));
        
        // 4. Cập nhật state tables
        setTables(tables.filter(table => table.id !== id));
        
        // 5. Thông báo thành công
        window.alert('Xóa phòng và tất cả option thành công!');
      }
    } catch (error) {
      console.error("Error deleting table and option:", error);
      window.alert("Lỗi: Không thể xóa phòng và option");
    }
  };

  const showDialog = (table) => {
    setSelectedTable(table);
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
    setSelectedTable(null);
  };

  const handleAddOrUpdateTable = async () => {
    try {
      // Kiểm tra các trường bắt buộc
      if (!selectedTable?.name?.trim()) {
        window.alert('Vui lòng nhập tên phòng');
        return;
      }

      if (!selectedTable?.price) {
        window.alert('Vui lòng nhập giá');
        return;
      }

      if (!selectedImage) {
        window.alert('Vui lòng chọn hình ảnh');
        return;
      }

      // Tạo tên file duy nhất và tải lên Storage
      const imageName = `Table/${Date.now()}.jpg`;
      const imageRef = ref(storage, imageName);
      
      // Chuyển URI thành blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Tải lên Firebase Storage
      await uploadBytes(imageRef, blob);
      
      // Lấy URL của hình ảnh
      const imageUrl = await getDownloadURL(imageRef);

      // Thêm phòng mới vào Firestore
      const tableData = {
        name: selectedTable.name.trim(),
        price: Number(selectedTable.price),
        image: imageUrl
      };

      const tablesRef = collection(db, "restaurants", restaurantId, "table");
      await addDoc(tablesRef, tableData);
      
      // Thông báo thành công
      window.alert('Thêm phòng mới thành công!');

      // Reset form và đóng dialog
      hideDialog();
      setSelectedImage(null);
      
      // Tải lại danh sách phòng
      const loadTables = async () => {
        try {
          const tablesRef = collection(db, "restaurants", restaurantId, "table");
          const tablesSnap = await getDocs(tablesRef);
          const tablesList = [];
          tablesSnap.forEach((doc) => {
            tablesList.push({ id: doc.id, ...doc.data() });
          });
          setTables(tablesList);
        } catch (error) {
          console.error("Error loading tables:", error);
          window.alert("Lỗi: Không thể tải danh sách các phòng");
        }
      };
      loadTables();
    } catch (error) {
      console.error("Error:", error);
      window.alert("Lỗi: Không thể thêm phòng mới");
    }
  };

  const renderTableItem = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={styles.tableCell}>{item.name}</Text>
      <View style={styles.tableImageContainer}>
        <Image source={{ uri: item.image }} style={styles.tableImage} />
      </View>
      <Text style={styles.tableCell}>{item.price}</Text>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('TableDetailsScreen', {
            tableId: item.id,
            restaurantId: restaurantId,
            restaurant: restaurant
          })}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteTable(item.id)} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

  const handleUpdateRestaurant = async () => {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);

      let newImageUrl = images; // Giữ URL hiện tại nếu không có ảnh mới

      // Kiểm tra nếu có ảnh mới được chọn
      if (imageUri) {
        // Xóa ảnh cũ nếu có
        if (images) {
          const oldImageRef = ref(storage, images); // Sử dụng đường dẫn, không phải URL
          await deleteObject(oldImageRef);
        }

        // Tải lên ảnh mới
        const imageName = `Restaurant/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);

        // Lấy URL ảnh mới với Access Token
        newImageUrl = await getDownloadURL(imageRef);
      }

      // Cập nhật thông tin nhà hàng
      await updateDoc(restaurantRef, { 
        restaurantName, // Cập nhật tên nhà hàng
        describe,       // Cập nhật mô tả
        businessAddress, // Cập nhật địa chỉ
        images: newImageUrl, // Cập nhật URL hình ảnh
        latitude,
        longitude,
      });

      setImages(newImageUrl);
      window.alert('Thành công: Đã cập nhật thông tin nhà hàng');
    } catch (error) {
      console.error("Error updating restaurant image:", error);
      window.alert('Lỗi: Không thể cập nhật thông tin nhà hàng');
    }
  };

  const doiTrang = (soTrang) => {
    setTrangHienTai(soTrang);
  };

  const viTriCuoiCung = trangHienTai * soHangMoiTrang;
  const viTriDauTien = viTriCuoiCung - soHangMoiTrang;
  const danhSachHienThi = tables.slice(viTriDauTien, viTriCuoiCung);

  const handleTableImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const uri = response.assets[0].uri;
        setSelectedImage(uri);
        setSelectedTable({ ...selectedTable, image: uri }); // Cập nhật URI tạm thời
      }
    });
  };

  const customIcon = L.divIcon({
    html: '<div style="font-size: 24px;">📍</div>',
    iconSize: [25, 25],
    className: 'custom-div-icon'
  });

  const MapPicker = ({ onLocationSelect }) => {
    const map = useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      },
    });
    return null;
  };

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
            <Text style={styles.header}>Chỉnh sửa nhà hàng: {restaurantName}</Text>
          </View>
        </View>
        
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Tên nhà hàng:</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên nhà hàng"
              value={restaurantName}
              onChangeText={setRestaurantName}
            />
            <Text style={styles.label}>Mô tả:</Text>
            <TextInput
              style={styles.input}
              placeholder="Mô tả"
              value={describe}
              onChangeText={setDescribe}
              multiline
              scrollEnabled
            />
            <Text style={styles.label}>Chọn vị trí trên bản đồ</Text>
            <View style={styles.mapContainer}>
              <MapContainer 
                center={mapPosition} 
                zoom={13} 
                style={{ height: '150px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {latitude && longitude && (
                  <Marker 
                    position={[parseFloat(latitude), parseFloat(longitude)]}
                    icon={customIcon}
                  />
                )}
                <MapPicker onLocationSelect={(lat, lng) => {
                  setLatitude(lat.toString());
                  setLongitude(lng.toString());
                  // Reverse geocoding để lấy địa chỉ
                  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(response => response.json())
                    .then(data => {
                      setBusinessAddress(data.display_name);
                    })
                    .catch(error => {
                      console.error("Lỗi khi lấy địa chỉ:", error);
                    });
                }} />
              </MapContainer>
            </View>
            <Text style={styles.label}>Địa chỉ</Text>
            <TextInput
              style={styles.input}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              multiline
            />
          </View>
          <View style={styles.imageColumn}>
            
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Image source={{ uri: images }} style={styles.image} />
            )}
            <TouchableOpacity onPress={handleImagePicker} style={styles.imageButton}>
              <Text style={styles.imageButtonText}>Chọn Hình Ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleUpdateRestaurant}>
          <Text style={styles.submitButtonText}>Cập Nhật Nhà Hàng</Text>
        </TouchableOpacity>

        <Text style={styles.header}>Danh sách các phòng</Text>
        <TouchableOpacity onPress={() => showDialog({ name: '', image: '', price: '' })} style={styles.addButton}>
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>Name</Text>
          <Text style={styles.headerCell}>Image</Text>
          <Text style={styles.headerCell}>price</Text>
          <Text style={styles.headerCell}>Chức năng</Text>
        </View>
        <FlatList
          data={danhSachHienThi}
          renderItem={renderTableItem}
          keyExtractor={(item) => item.id}
        />

        <View style={styles.phanTrangContainer}>
          {Array.from({ length: Math.ceil(tables.length / soHangMoiTrang) }).map((_, index) => (
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
            <Dialog.Title style={styles.dialogTitle}>Thêm các phòng</Dialog.Title>
            <Dialog.Content>
              <View style={styles.dialogContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tên phòng <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tên phòng"
                    value={selectedTable?.name || ''}
                    onChangeText={(text) => setSelectedTable({ ...selectedTable, name: text })}
                  />
                  <Text style={styles.label}>Giá <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập giá"
                    value={selectedTable?.price?.toString() || ''}
                    onChangeText={(text) => {
                      // Chỉ cho phép nhập số
                      if (text === '' || /^\d+$/.test(text)) {
                        setSelectedTable(prev => ({...prev, price: text}))
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.imageContainer}>
                  <Text style={styles.label}>Hình ảnh <Text style={styles.required}>*</Text></Text>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder} />
                  )}
                  <TouchableOpacity onPress={handleTableImagePicker} style={styles.imagePickerButton}>
                    <Text style={styles.imagePickerButtonText}>Chọn Hình Ảnh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <Button onPress={hideDialog} textColor="#007BFF">Hủy</Button>
              <Button onPress={handleAddOrUpdateTable} textColor="#007BFF">Thêm</Button>
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
    marginTop: 20,
    width: 200,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
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
  tableImage: {
    width: 100,
    height: 60,
    resizeMode: 'contain',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  imageButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  imageButtonText: {
    color: 'white',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#28A745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
    marginBottom: 10,
    width: 60,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
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
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#AAAAAA',
  },
  required: {
    color: 'red',
    fontSize: 14,
  },
  image: {
    width: 300,
    height: 300,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'flex-start',
    width: 175,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  coordinateField: {
    flex: 1,
    marginRight: 8,
  },
  coordinateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
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
  imagePickerContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  previewImage: {
    width: 200,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  imagePickerButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 14,
  },
  dialogContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inputContainer: {
    flex: 1,
    marginRight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
  },
  imageContainer: {
    width: 150,
    alignItems: 'center',
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
  dialogActions: {
    padding: 15,
    justifyContent: 'flex-end',
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
  imagePlaceholder: {
    width: 150,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 10,
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
  mapContainer: {
    height: 150,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default RestaurantDetails;
