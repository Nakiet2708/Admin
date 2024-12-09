import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';

const AppointmentDetails = ({ route, navigation }) => {
  const { appointment } = route.params;
  console.log('Received appointment:', appointment);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Chưa nhận hàng':
        return '#FFA500'; // Màu cam
      case 'Đã nhận hàng':
        return '#4CAF50'; // Màu xanh lá
      case 'Chưa nhận phòng':
        return '#FF9800'; // Màu cam đậm
      case 'Đã nhận phòng':
        return '#2196F3'; // Màu xanh dương
      default:
        return '#000000';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDateTime = (dateTime) => {
    try {
      if (dateTime && dateTime.seconds) {
        const date = new Date(dateTime.seconds * 1000);
        return date.toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      }
      return 'Không có dữ liệu';
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Không có dữ liệu';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Chi tiết đơn hàng</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Thông tin khách hàng</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tên khách hàng:</Text>
              <Text style={styles.value}>{appointment.username}</Text>
            </View>
            {appointment.recipientName && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Người nhận:</Text>
                <Text style={styles.value}>{appointment.recipientName}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Số điện thoại khách hàng:</Text>
              <Text style={styles.value}>{appointment.phone}</Text>
            </View>
            {appointment.recipientPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Số điện thoại người nhận:</Text>
                <Text style={styles.value}>{appointment.recipientPhone}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{appointment.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Địa chỉ:</Text>
              <Text style={styles.value}>{appointment.address}</Text>
            </View>
            <View style={[styles.infoRow, styles.lastRow]}>
              <Text style={styles.label}>Vị trí:</Text>
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => {
                  const url = `https://www.google.com/maps?q=${appointment.latitude},${appointment.longitude}`;
                  Linking.openURL(url);
                }}
              >
                <Text style={styles.mapButtonText}>Xem trên bản đồ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Thông tin đặt bàn</Text>
          {appointment.tableItems && appointment.tableItems.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name} - {item.restaurantName}</Text>
                <Text style={styles.itemInfo}>Ngày: {item.date}</Text>
                <Text style={styles.itemInfo}>Thời gian: {item.timeSlot}</Text>
                <Text style={styles.itemInfo}>Giá: {formatPrice(item.price)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Thông tin món ăn</Text>
          {appointment.otherItems && appointment.otherItems.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} >{item.name}</Text>
                <Text style={styles.itemInfo}>Số lượng: {item.quantity}</Text>
                <Text style={styles.itemInfo}>
                  Giá: {formatPrice(item.ProductTotalPrice)}  Đã giảm {formatPrice(item.discountAmount * item.quantity)}
                </Text>
                {item.options && item.options.map((option, optIndex) => (
                  <Text key={optIndex} style={styles.itemOption}>
                    - {option}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Thông tin thanh toán</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tổng tiền:</Text>
            <Text style={styles.value}>{formatPrice(appointment.totalPrice)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Trạng thái:</Text>
            <Text style={[styles.value, { color: getStatusColor(appointment.status) }]}>
              {appointment.status}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Thời gian đặt:</Text>
            <Text style={styles.value}>{formatDateTime(appointment.dateTime)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    flex: 2,
    fontSize: 15,
    color: '#333',
  },
  mapButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  itemInfo: {
    color: '#666',
    marginBottom: 4,
    fontSize: 14,
  },
});

export default AppointmentDetails;