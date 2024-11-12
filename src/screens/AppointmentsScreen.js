import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { getFirestore, collection, getDocs, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { app } from '../../config';

// Thêm các hàm tiện ích này vào đầu file, trước component AppointmentsScreen
const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  
  // Kiểm tra nếu timestamp là Timestamp từ Firestore
  if (timestamp && timestamp.seconds) {
    // Chuyển đổi Firestore Timestamp thành Date
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Nếu là định dạng Date string thông thường
  const date = new Date(timestamp);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatPrice = (price) => {
  if (!price) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
};

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  const statusOptions = [
    'Tất cả',
    'Chưa nhận phòng',
    'Đã nhận phòng',
    'Chưa nhận hàng',
    'Đã nhận hàng'
  ];

  useEffect(() => {
    // Tạo query với sắp xếp theo thời gian
    const appointmentsRef = collection(db, "Appointments");
    const q = query(appointmentsRef, orderBy("dateTime", "desc"));

    // Thiết lập real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const appointmentsList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          appointmentsList.push({ id: doc.id, ...data });
        });
        
        setAppointments(appointmentsList);
      } catch (error) {
        console.error("Error loading appointments:", error);
        alert("Không thể tải danh sách đơn hàng");
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error setting up real-time listener:", error);
      alert("Lỗi kết nối với server");
    });

    // Cleanup function để remove listener khi component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    const confirmMessage = newStatus === 'Đã nhận hàng' 
      ? 'Bạn có chắc chắn muốn xác nhận đã nhận hàng?' 
      : 'Bạn có chắc chắn muốn xác nhận đã nhận phòng?';

    if (window.confirm(confirmMessage)) {
      try {
        const appointmentRef = doc(db, "Appointments", appointmentId);
        await updateDoc(appointmentRef, {
          status: newStatus
        });
        
        setAppointments(appointments.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: newStatus }
            : appointment
        ));
        
        let message = '';
        switch (newStatus) {
          case 'Đã nhận hàng':
            message = 'Xác nhận nhận hàng thành công!';
            break;
          case 'Đã nhận phòng':
            message = 'Xác nhận nhận phòng thành công!';
            break;
          default:
            message = 'Cập nhật trạng thái thành công!';
        }
        
        alert(message);
      } catch (error) {
        console.error("Error updating status:", error);
        alert("Không thể cập nhật trạng thái");
      }
    }
  };

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tableRow}
      onPress={() => navigation.navigate('AppointmentDetails', { appointment: item })}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.label}>Thời gian</Text>
        <Text style={styles.value}>{formatDateTime(item.dateTime)}</Text>
      </View>

      <View style={styles.customerColumn}>
        <Text style={styles.label}>Khách hàng</Text>
        <Text style={styles.value}>{item.username}</Text>
        <Text style={styles.phoneValue}>{item.phone}</Text>
      </View>

      <View style={styles.addressColumn}>
        <Text style={styles.label}>Địa chỉ</Text>
        <Text style={styles.value}>{item.address}</Text>
      </View>

      <View style={styles.priceColumn}>
        <Text style={styles.label}>Tổng tiền</Text>
        <Text style={styles.priceValue}>{formatPrice(item.totalPrice)}</Text>
      </View>

      <View style={styles.statusColumn}>
        <Text style={styles.label}>Trạng thái</Text>
        {item.status === 'Chưa nhận phòng' ? (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // Ngăn không cho sự kiện click lan ra ngoài
              handleUpdateStatus(item.id, 'Đã nhận phòng');
            }}
          >
            <Text style={styles.actionButtonText}>Nhận phòng</Text>
          </TouchableOpacity>
        ) : item.status === 'Chưa nhận hàng' ? (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // Ngăn không cho sự kiện click lan ra ngoài
              handleUpdateStatus(item.id, 'Đã nhận hàng');
            }}
          >
            <Text style={styles.actionButtonText}>Nhận hàng</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPagination = () => {
    const totalPages = Math.ceil(appointments.length / itemsPerPage);
    const maxVisiblePages = 5; // Số trang hiển thị tối đa
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Điều chỉnh lại startPage nếu endPage đã chạm giới hạn
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];

    // Nút Previous
    pages.push(
      <TouchableOpacity
        key="prev"
        style={[styles.pageButton, currentPage === 1 && styles.disabledPageButton]}
        onPress={() => currentPage > 1 && paginate(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <Text style={[styles.pageButtonText, currentPage === 1 && styles.disabledPageButtonText]}>
          ←
        </Text>
      </TouchableOpacity>
    );

    // Trang đầu tiên
    if (startPage > 1) {
      pages.push(
        <TouchableOpacity
          key={1}
          style={[styles.pageButton, currentPage === 1 && styles.activePageButton]}
          onPress={() => paginate(1)}
        >
          <Text style={[styles.pageButtonText, currentPage === 1 && styles.activePageButtonText]}>1</Text>
        </TouchableOpacity>
      );
      if (startPage > 2) {
        pages.push(<Text key="dots1" style={styles.pageButtonText}>...</Text>);
      }
    }

    // Các trang ở giữa
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <TouchableOpacity
          key={i}
          style={[styles.pageButton, currentPage === i && styles.activePageButton]}
          onPress={() => paginate(i)}
        >
          <Text style={[styles.pageButtonText, currentPage === i && styles.activePageButtonText]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    // Trang cuối cùng
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<Text key="dots2" style={styles.pageButtonText}>...</Text>);
      }
      pages.push(
        <TouchableOpacity
          key={totalPages}
          style={[styles.pageButton, currentPage === totalPages && styles.activePageButton]}
          onPress={() => paginate(totalPages)}
        >
          <Text style={[styles.pageButtonText, currentPage === totalPages && styles.activePageButtonText]}>
            {totalPages}
          </Text>
        </TouchableOpacity>
      );
    }

    // Nút Next
    pages.push(
      <TouchableOpacity
        key="next"
        style={[styles.pageButton, currentPage === totalPages && styles.disabledPageButton]}
        onPress={() => currentPage < totalPages && paginate(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <Text style={[styles.pageButtonText, currentPage === totalPages && styles.disabledPageButtonText]}>
          →
        </Text>
      </TouchableOpacity>
    );

    return <View style={styles.pagination}>{pages}</View>;
  };

  // Lọc dữ liệu theo trạng thái
  const getFilteredData = () => {
    let filteredData = appointments;
    
    // Lọc theo trạng thái
    if (selectedStatus !== 'Tất cả') {
      filteredData = filteredData.filter(item => item.status === selectedStatus);
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter(item =>
        item.username?.toLowerCase().includes(searchLower) ||
        item.phone?.toLowerCase().includes(searchLower) ||
        item.address?.toLowerCase().includes(searchLower)
      );
    }
    
    return filteredData;
  };

  // Cập nhật getCurrentPageData để sử dụng dữ liệu đã lọc
  const getCurrentPageData = () => {
    const filteredData = getFilteredData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  };

  // Thêm hàm để xử lý việc chuyển trang
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Quản lý đơn hàng</Text>
        
        <View style={styles.headerRight}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên, SĐT hoặc địa chỉ..."
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

          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowStatusFilter(true)}
          >
            <Text style={styles.filterButtonText}>
              {selectedStatus} ▼
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={getCurrentPageData()}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      {renderPagination()}

      {/* Modal cho bộ lọc */}
      <Modal
        visible={showStatusFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusFilter(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusFilter(false)}
        >
          <View style={styles.modalContent}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  selectedStatus === status && styles.selectedStatusOption
                ]}
                onPress={() => {
                  setSelectedStatus(status);
                  setCurrentPage(1); // Reset về trang 1 khi thay đổi bộ lọc
                  setShowStatusFilter(false);
                }}
              >
                <Text style={[
                  styles.statusOptionText,
                  selectedStatus === status && styles.selectedStatusOptionText
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  phoneValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timeColumn: {
    width: '15%',
    paddingRight: 10,
  },
  customerColumn: {
    width: '20%',
    paddingRight: 10,
  },
  addressColumn: {
    width: '35%',
    paddingRight: 10,
  },
  priceColumn: {
    width: '15%',
    paddingRight: 10,
  },
  statusColumn: {
    width: '15%',
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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
  },
  activePageButtonText: {
    color: '#fff',
  },
  disabledPageButtonText: {
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    gap: 12,
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
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 100,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  statusOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedStatusOption: {
    backgroundColor: '#f0f0f0',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedStatusOptionText: {
    color: '#007bff',
    fontWeight: '500',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

const getStatusBgColor = (status) => {
  switch (status) {
    case 'Đã nhận phòng':
      return '#2ecc71';
    case 'Đã nhận hàng':
      return '#2ecc71';
    case 'Chưa nhận phòng':
      return '#e67e22';
    case 'Chưa nhận hàng':
      return '#e67e22';
    default:
      return '#95a5a6';
  }
};

export default AppointmentsScreen;