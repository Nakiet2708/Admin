import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Modal } from 'react-native';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { app } from '../../config';

const db = getFirestore(app);
const storage = getStorage(app);

function AdvertisementManager() {
  const [advertisements, setAdvertisements] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedAd, setSelectedAd] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAdvertisements();
  }, []);

  const fetchAdvertisements = async () => {
    try {
      const advertisementsRef = collection(db, "Advertisement");
      const q = query(advertisementsRef, orderBy("time", "desc"));
      const querySnapshot = await getDocs(q);
      const ads = [];
      querySnapshot.forEach((doc) => {
        ads.push({ id: doc.id, ...doc.data() });
      });
      setAdvertisements(ads);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      window.alert('Không thể tải danh sách quảng cáo');
    }
  };

  const handleImagePicker = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.error) {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  const handleAddOrUpdateAd = async () => {
    try {
      if (!selectedImage) {
        window.alert('Vui lòng chọn hình ảnh');
        return;
      }

      let imageUrl = '';
      if (selectedImage) {
        // Nếu đang cập nhật và có ảnh cũ, xóa ảnh cũ
        if (isEditing && selectedAd.image) {
          const oldImageRef = ref(storage, selectedAd.image);
          await deleteObject(oldImageRef);
        }

        const imageName = `Advertisement/${Date.now()}.jpg`;
        const imageRef = ref(storage, imageName);
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      if (isEditing) {
        // Cập nhật quảng cáo
        await updateDoc(doc(db, "Advertisement", selectedAd.id), {
          image: imageUrl || selectedAd.image,
          time: new Date()
        });
        window.alert('Cập nhật quảng cáo thành công!');
      } else {
        // Thêm quảng cáo mới
        await addDoc(collection(db, "Advertisement"), {
          image: imageUrl,
          time: new Date()
        });
        window.alert('Thêm quảng cáo thành công!');
      }

      setDialogVisible(false);
      setSelectedImage(null);
      setSelectedAd(null);
      setIsEditing(false);
      fetchAdvertisements();
    } catch (error) {
      console.error("Error:", error);
      window.alert('Không thể thêm/cập nhật quảng cáo');
    }
  };

  const handleDelete = async (ad) => {
    try {
      if (window.confirm('Bạn có chắc muốn xóa quảng cáo này?')) {
        // Xóa ảnh từ Storage
        if (ad.image) {
          const imageRef = ref(storage, ad.image);
          await deleteObject(imageRef);
        }

        // Xóa document từ Firestore
        await deleteDoc(doc(db, "Advertisement", ad.id));
        window.alert('Xóa quảng cáo thành công!');
        fetchAdvertisements();
      }
    } catch (error) {
      console.error("Error deleting advertisement:", error);
      window.alert('Không thể xóa quảng cáo');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.adCard}>
      <Image source={{ uri: item.image }} style={styles.adImage} />
      <Text style={styles.timeText}>
        Thời gian: {new Date(item.time.seconds * 1000).toLocaleString('vi-VN')}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => {
            setSelectedAd(item);
            setIsEditing(true);
            setDialogVisible(true);
          }}
        >
          <Text style={styles.buttonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setIsEditing(false);
          setSelectedAd(null);
          setSelectedImage(null);
          setDialogVisible(true);
        }}
      >
        <Text style={styles.addButtonText}>Thêm Quảng Cáo</Text>
      </TouchableOpacity>

      <FlatList
        data={advertisements}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        visible={dialogVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDialogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Cập nhật Quảng Cáo' : 'Thêm Quảng Cáo Mới'}
            </Text>

            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            ) : isEditing && selectedAd?.image ? (
              <Image source={{ uri: selectedAd.image }} style={styles.previewImage} />
            ) : null}

            <TouchableOpacity style={styles.imageButton} onPress={handleImagePicker}>
              <Text style={styles.imageButtonText}>Chọn Ảnh</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDialogVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddOrUpdateAd}
              >
                <Text style={styles.modalButtonText}>
                  {isEditing ? 'Cập nhật' : 'Thêm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  listContainer: {
    padding: 8,
  },
  adCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '100%',
  },
  adImage: {
    width: '40%',
    height: undefined,
    aspectRatio: 2 / 1,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    alignSelf: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#1976D2',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  previewImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 2 / 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageButton: {
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#6C757D',
  },
  submitButton: {
    backgroundColor: '#28A745',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default AdvertisementManager; 