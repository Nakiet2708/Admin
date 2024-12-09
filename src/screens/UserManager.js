import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Picker } from 'react-native';
import { getFirestore, collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Provider, Portal, Dialog, Button, DataTable, TextInput, Paragraph } from 'react-native-paper';
import { app } from '../../config';

// Thêm hàm format timestamp
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 5;
  const db = getFirestore(app);
  const [editRoleVisible, setEditRoleVisible] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    const usersRef = collection(db, "USERS");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      try {
        const usersList = [];
        snapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        // Sắp xếp theo thời gian mới nhất
        usersList.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setUsers(usersList);
      } catch (error) {
        console.error("Lỗi khi tải danh sách:", error);
        window.alert("Không thể tải danh sách người dùng");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "USERS", selectedUser.id));
      setDeleteVisible(false);
      window.alert("Xóa người dùng thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      window.alert("Không thể xóa người dùng");
    }
  };

  const getFilteredData = () => {
    if (!searchQuery.trim()) return users;
    
    const searchLower = searchQuery.toLowerCase().trim();
    return users.filter(user =>
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user.address?.toLowerCase().includes(searchLower)
    );
  };

  const getCurrentPageData = () => {
    const filteredData = getFilteredData();
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  };

  const renderPagination = () => {
    const filteredData = getFilteredData();
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];

    // Nút Previous
    pages.push(
      <TouchableOpacity
        key="prev"
        style={[styles.pageButton, page === 1 && styles.disabledPageButton]}
        onPress={() => page > 1 && setPage(page - 1)}
        disabled={page === 1}
      >
        <Text style={[styles.pageButtonText, page === 1 && styles.disabledPageButtonText]}>
          ←
        </Text>
      </TouchableOpacity>
    );

    // Trang đầu
    if (startPage > 1) {
      pages.push(
        <TouchableOpacity
          key={1}
          style={[styles.pageButton, page === 1 && styles.activePageButton]}
          onPress={() => setPage(1)}
        >
          <Text style={[styles.pageButtonText, page === 1 && styles.activePageButtonText]}>1</Text>
        </TouchableOpacity>
      );
      if (startPage > 2) {
        pages.push(<Text key="dots1" style={styles.pageButtonText}>...</Text>);
      }
    }

    // Các trang giữa
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <TouchableOpacity
          key={i}
          style={[styles.pageButton, page === i && styles.activePageButton]}
          onPress={() => setPage(i)}
        >
          <Text style={[styles.pageButtonText, page === i && styles.activePageButtonText]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    // Trang cuối
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<Text key="dots2" style={styles.pageButtonText}>...</Text>);
      }
      pages.push(
        <TouchableOpacity
          key={totalPages}
          style={[styles.pageButton, page === totalPages && styles.activePageButton]}
          onPress={() => setPage(totalPages)}
        >
          <Text style={[styles.pageButtonText, page === totalPages && styles.activePageButtonText]}>
            {totalPages}
          </Text>
        </TouchableOpacity>
      );
    }

    // Nút Next
    pages.push(
      <TouchableOpacity
        key="next"
        style={[styles.pageButton, page === totalPages && styles.disabledPageButton]}
        onPress={() => page < totalPages && setPage(page + 1)}
        disabled={page === totalPages}
      >
        <Text style={[styles.pageButtonText, page === totalPages && styles.disabledPageButtonText]}>
          →
        </Text>
      </TouchableOpacity>
    );

    return <View style={styles.pagination}>{pages}</View>;
  };

  const showUserDetail = (user) => {
    setSelectedUser(user);
    setDetailVisible(true);
  };

  const handleEditRole = async () => {
    try {
      await updateDoc(doc(db, "USERS", selectedUser.id), {
        role: newRole
      });
      setEditRoleVisible(false);
      window.alert("Cập nhật vai trò thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      window.alert("Không thể cập nhật vai trò");
    }
  };

  return (
    <Provider>
      <View style={styles.container}>
        <Text style={styles.header}>Quản lý người dùng</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên, email, SĐT hoặc địa chỉ..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
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

        <DataTable style={styles.table}>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title textStyle={styles.tableHeaderText} style={styles.column}>
              Ngày tạo
            </DataTable.Title>
            <DataTable.Title textStyle={styles.tableHeaderText} style={styles.column}>
              Tên đăng nhập
            </DataTable.Title>
            <DataTable.Title textStyle={styles.tableHeaderText} style={styles.column}>
              Email
            </DataTable.Title>
            <DataTable.Title textStyle={styles.tableHeaderText} style={styles.column}>
              Số điện thoại
            </DataTable.Title>
            <DataTable.Title textStyle={styles.tableHeaderText} style={styles.column}>
              Địa chỉ
            </DataTable.Title>
            <DataTable.Title textStyle={styles.tableHeaderText} style={styles.actionColumn}>
              Thao tác
            </DataTable.Title>
          </DataTable.Header>

          <ScrollView>
            {getCurrentPageData().map((item, index) => (
              <DataTable.Row 
                key={item.id} 
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}
              >
                <DataTable.Cell textStyle={styles.cellText} style={styles.column}>
                  {formatDate(item.createdAt)}
                </DataTable.Cell>
                <DataTable.Cell textStyle={styles.cellText} style={styles.column}>{item.username}</DataTable.Cell>
                <DataTable.Cell textStyle={styles.cellText} style={styles.column}>{item.email}</DataTable.Cell>
                <DataTable.Cell textStyle={styles.cellText} style={styles.column}>{item.phone}</DataTable.Cell>
                <DataTable.Cell textStyle={styles.cellText} style={styles.column}>{item.address}</DataTable.Cell>
                <DataTable.Cell style={styles.actionColumn}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.detailButton}
                      onPress={() => showUserDetail(item)}
                    >
                      <Text style={styles.buttonText}>Chi tiết</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        setSelectedUser(item);
                        setDeleteVisible(true);
                      }}
                    >
                      <Text style={styles.buttonText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </ScrollView>
        </DataTable>

        {renderPagination()}

        <Portal>
          <Dialog visible={deleteVisible} onDismiss={() => setDeleteVisible(false)} style={styles.deleteDialog}>
            <Dialog.Title style={styles.deleteDialogTitle}>Xác nhận xóa</Dialog.Title>
            <Dialog.Content>
              <Paragraph style={styles.deleteDialogContent}>Bạn có chắc xóa người dùng này?</Paragraph>
            </Dialog.Content>
            <Dialog.Actions style={styles.deleteDialogActions}>
              <Button onPress={() => setDeleteVisible(false)} textColor="#007BFF">Hủy</Button>
              <Button onPress={handleDelete} textColor="#007BFF">Xóa</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        <Portal>
          <Dialog 
            visible={detailVisible} 
            onDismiss={() => setDetailVisible(false)}
            style={styles.dialogStyle}
          >
            <Dialog.Title style={styles.dialogTitle}>Thông tin chi tiết</Dialog.Title>
            <Dialog.Content>
              {selectedUser && (
                <View style={styles.detailContainer}>
                  <View style={styles.row}>
                    <InfoField label="Tên đăng nhập" value={selectedUser.username} />
                    <InfoField label="Giới tính" value={selectedUser.gender} />
                  </View>

                  <View style={styles.row}>
                    <InfoField label="Email" value={selectedUser.email} />
                    <InfoField label="Số điện thoại" value={selectedUser.phone} />
                  </View>

                  <View style={styles.row}>
                    <InfoField label="Địa chỉ" value={selectedUser.address} />
                    <InfoField label="Ngày tạo" value={formatDate(selectedUser.createdAt)} />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.label}>Vai trò:</Text>
                      <View style={styles.roleSelectContainer}>
                        <Picker
                          selectedValue={selectedUser.role || 'user'}
                          onValueChange={async (itemValue) => {
                            try {
                              const roleValue = itemValue === 'user' ? null : itemValue; // Chuyển 'user' thành null khi lưu
                              await updateDoc(doc(db, "USERS", selectedUser.id), {
                                role: roleValue
                              });
                              setSelectedUser({...selectedUser, role: roleValue});
                              window.alert("Cập nhật vai trò thành công!");
                            } catch (error) {
                              console.error("Lỗi khi cập nhật:", error);
                              window.alert("Không thể cập nhật vai trò");
                            }
                          }}
                          style={styles.rolePicker}
                        >
                          <Picker.Item label="User" value="user" />
                          <Picker.Item label="Admin" value="admin" />
                        </Picker>
                      </View>
                    </View>
                    <InfoField 
                      label="Tọa độ" 
                      value={`${selectedUser.latitude}, ${selectedUser.longitude}`} 
                    />
                  </View>
                </View>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button 
                mode="outlined" 
                onPress={() => setDetailVisible(false)}
                style={styles.closeButton}
              >
                Đóng
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Provider>
  );
};

// Component hiển thị từng trường thông tin
const InfoField = ({ label, value }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value} numberOfLines={2}>{value || '---'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  table: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4ea',
  },
  tableHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dfe4ea',
  },
  tableHeaderText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#dfe4ea',
    backgroundColor: '#ffffff',
  },
  tableRowAlternate: {
    backgroundColor: '#f8f9fa',
  },
  cellText: {
    color: '#000000',
    fontSize: 14,
    padding: 8,
  },
  column: {
    minWidth: 150,
    flex: 1,
    justifyContent: 'center',
  },
  actionColumn: {
    minWidth: 100,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4757',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activePageButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  disabledPageButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  activePageButtonText: {
    color: '#fff',
  },
  disabledPageButtonText: {
    color: '#6c757d',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailButton: {
    backgroundColor: '#3498db',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 50,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  dialogTitle: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  detailContainer: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    color: '#000000',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    color: '#000000',
  },
  dialogStyle: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  roleInput: {
    height: 36,
    textAlign: 'center',
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 8,
    borderColor: '#2196F3',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
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
  roleSelectContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    marginTop: 4,
  },
  rolePicker: {
    height: 40,
    width: '100%',
    backgroundColor: 'transparent',
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
});

export default UserManager;