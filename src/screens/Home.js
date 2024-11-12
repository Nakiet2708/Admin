import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Provider, Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { app } from '../../config';
import { getStorage } from 'firebase/storage';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tạo custom icon ở ngoài component
const customIcon = L.divIcon({
  html: '<div style="font-size: 24px;">📍</div>',
  iconSize: [25, 25],
  className: 'custom-div-icon'
});

const HomeScreen = ({ navigation }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    restaurantName: '',
    describe: '',
    businessAddress: '',
    latitude: '',
    longitude: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [mapPosition, setMapPosition] = useState([10.8231, 106.6297]); // Default: TP.HCM
  const db = getFirestore(app);
  const storage = getStorage(app);

  useEffect(() => {
    const restaurantsRef = collection(db, "restaurants");
    const unsubscribe = onSnapshot(restaurantsRef, (snapshot) => {
      try {
        const restaurantList = [];
        snapshot.forEach((doc) => {
          restaurantList.push({ id: doc.id, ...doc.data() });
        });
        const sortedRestaurants = restaurantList.sort((a, b) => 
          a.restaurantName.localeCompare(b.restaurantName, 'vi', { numeric: true })
        );
        setRestaurants(sortedRestaurants);
      } catch (error) {
        console.error("Lỗi khi tải danh sách:", error);
        window.alert("Không thể tải danh sách nhà hàng");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    try {
      // 1. Xóa tất cả options của mỗi table
      const tablesRef = collection(db, "restaurants", selectedId, "table");
      const tablesSnapshot = await getDocs(tablesRef);
      
      for (const tableDoc of tablesSnapshot.docs) {
        // Lấy và xóa tất cả options của table hiện tại
        const optionsRef = collection(db, "restaurants", selectedId, "table", tableDoc.id, "option");
        const optionsSnapshot = await getDocs(optionsRef);
        
        // Xóa từng option và hình ảnh của nó
        for (const optionDoc of optionsSnapshot.docs) {
          const optionData = optionDoc.data();
          if (optionData.image) {
            try {
              const optionImageRef = ref(storage, optionData.image);
              await deleteObject(optionImageRef);
            } catch (error) {
              console.error("Lỗi khi xóa ảnh option:", error);
            }
          }
          await deleteDoc(optionDoc.ref);
        }

        // Xóa hình ảnh của table nếu có
        const tableData = tableDoc.data();
        if (tableData.image) {
          try {
            const tableImageRef = ref(storage, tableData.image);
            await deleteObject(tableImageRef);
          } catch (error) {
            console.error("Lỗi khi xóa ảnh table:", error);
          }
        }
        
        // Xóa table
        await deleteDoc(tableDoc.ref);
      }

      // 2. Xóa hình ảnh của nhà hàng nếu có
      const restaurantDoc = await getDoc(doc(db, "restaurants", selectedId));
      const restaurantData = restaurantDoc.data();
      if (restaurantData.images) {
        try {
          const restaurantImageRef = ref(storage, restaurantData.images);
          await deleteObject(restaurantImageRef);
        } catch (error) {
          console.error("Lỗi khi xóa ảnh nhà hàng:", error);
        }
      }

      // 3. Cuối cùng xóa nhà hàng
      await deleteDoc(doc(db, "restaurants", selectedId));
      setVisible(false);
      window.alert("Xóa nhà hàng thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      window.alert("Lỗi: Không thể xóa nhà hàng");
    }
  };

  const showDialog = (id) => {
    setSelectedId(id);
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  const handleImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.error) {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const handleAddRestaurant = async () => {
    try {
      if (!newRestaurant.restaurantName.trim()) {
        window.alert('Vui lòng nhập tên nhà hàng');
        return;
      }
      if (!newRestaurant.describe.trim()) {
        window.alert('Vui lòng nhập mô tả');
        return;
      }
      if (!newRestaurant.businessAddress.trim()) {
        window.alert('Vui lòng nhập địa chỉ');
        return;
      }
      if (!newRestaurant.latitude.trim()) {
        window.alert('Vui lòng nhập vĩ độ');
        return;
      }
      if (!newRestaurant.longitude.trim()) {
        window.alert('Vui lòng nhập kinh độ');
        return;
      }
      if (!selectedImage) {
        window.alert('Vui lòng chọn hình ảnh');
        return;
      }

      let imageUrl = '';
      if (selectedImage) {
        const imageName = `Restaurant/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "restaurants"), {
        ...newRestaurant,
        images: imageUrl
      });

      setAddDialogVisible(false);
      setNewRestaurant({
        restaurantName: '',
        describe: '',
        businessAddress: '',
        latitude: '',
        longitude: ''
      });
      setSelectedImage(null);
      window.alert('Thêm nhà hàng thành công!');
    } catch (error) {
      console.error("Error adding restaurant:", error);
      window.alert('Lỗi: Không thể thêm nhà hàng');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.restaurantItem}>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.restaurantName}</Text>
        <Text style={styles.restaurantAddress}>{item.businessAddress}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.editButton]}
          onPress={() => navigation.navigate('RestaurantDetailsScreen', { 
            restaurantId: item.id,
            restaurant: item 
          })}
        >
          <Text style={styles.buttonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.deleteButton]}
          onPress={() => showDialog(item.id)}
        >
          <Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <View style={styles.container}>
        <View style={styles.addButtonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setAddDialogVisible(true)}
          >
            <Text style={styles.addButtonText}>Thêm Nhà Hàng Mới</Text>
          </TouchableOpacity>
        </View>
        
        {restaurants.length === 0 ? (
          <Text style={styles.emptyText}>Không có nhà hàng nào</Text>
        ) : (
          <FlatList
            data={restaurants}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
        )}
        <Portal>
          <Dialog visible={visible} onDismiss={hideDialog} style={styles.deleteDialog}>
            <Dialog.Title style={styles.deleteDialogTitle}>Xác nhận xóa</Dialog.Title>
            <Dialog.Content>
              <Paragraph style={styles.deleteDialogContent}>Bạn có chắc muốn xóa nhà hàng này?</Paragraph>
            </Dialog.Content>
            <Dialog.Actions style={styles.deleteDialogActions}>
              <Button onPress={hideDialog} textColor="#007BFF">Hủy</Button>
              <Button onPress={handleDelete} textColor="#007BFF">Xóa</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        <Portal>
          <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)} style={styles.dialog}>
            <Dialog.Title style={styles.dialogTitle}>Thêm Nhà Hàng Mới</Dialog.Title>
            <Dialog.Content>
              <View style={styles.dialogContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tên nhà hàng <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Tên nhà hàng"
                    value={newRestaurant.restaurantName}
                    onChangeText={(text) => setNewRestaurant({...newRestaurant, restaurantName: text})}
                  />
                  <Text style={styles.label}>Mô tả <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Mô tả"
                    value={newRestaurant.describe}
                    onChangeText={(text) => setNewRestaurant({...newRestaurant, describe: text})}
                    multiline
                  />
                  
                  <Text style={styles.label}>Chọn vị trí trên bản đồ <Text style={styles.required}>*</Text></Text>
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
                      {newRestaurant.latitude && newRestaurant.longitude && (
                        <Marker 
                          position={[
                            parseFloat(newRestaurant.latitude), 
                            parseFloat(newRestaurant.longitude)
                          ]}
                          icon={customIcon}
                        />
                      )}
                      <MapPicker onLocationSelect={(lat, lng) => {
                        setNewRestaurant({
                          ...newRestaurant,
                          latitude: lat.toString(),
                          longitude: lng.toString(),
                          businessAddress: "Đang tải địa chỉ..."
                        });
                        // Reverse geocoding để lấy địa chỉ
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                          .then(response => response.json())
                          .then(data => {
                            setNewRestaurant(prev => ({
                              ...prev,
                              businessAddress: data.display_name
                            }));
                          })
                          .catch(error => {
                            console.error("Lỗi khi lấy địa chỉ:", error);
                          });
                      }} />
                    </MapContainer>
                  </View>

                  <Text style={styles.label}>Địa chỉ</Text>
                  <TextInput
                    style={styles.dialogInput}
                    value={newRestaurant.businessAddress}
                    editable={false}
                    multiline
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
              <Button onPress={handleAddRestaurant} textColor="#007BFF">Thêm</Button>
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
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  restaurantItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  addButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 180,
  },
  addButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordinateInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 10,
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
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordinateField: {
    flex: 1,
    marginRight: 8,
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
  dialogActions: {
    padding: 15,
    justifyContent: 'flex-end',
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
  mapContainer: {
    height: 150,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default HomeScreen;
