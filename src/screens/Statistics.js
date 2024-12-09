import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, StyleSheet, Picker, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getFirestore, collection, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import moment from 'moment';
import { app } from '../../config';

const screenWidth = Dimensions.get('window').width;
const db = getFirestore();

// Thêm dữ liệu mặc định cho biểu đồ
const defaultChartData = {
  labels: ['Chưa có dữ liệu'],
  datasets: [{
    data: [0]
  }],
  maxValue: 1
};

export default function Statistics() {
  const [Appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [restaurants, setRestaurants] = useState(['Tất cả']);
  const [selectedRestaurant, setSelectedRestaurant] = useState('Tất cả');
  const [dateRange, setDateRange] = useState({
    startDate: moment().subtract(6, 'days').toDate(),
    endDate: new Date()
  });
  const [isDatePickerVisible, setDatePickerVisible] = useState({
    start: false,
    end: false
  });


  const hideDatePicker = (type) => {
    setDatePickerVisible(prev => ({...prev, [type]: false}));
  };

  // Fetch dữ liệu từ Firestore
  useEffect(() => {
    const AppointmentsRef = collection(db, 'Appointments');
    
    // Tạo listener để lắng nghe thay đổi
    const unsubscribe = onSnapshot(AppointmentsRef, (snapshot) => {
      try {
        const AppointmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Lấy danh sách nhà hàng duy nhất (bỏ 'Tất cả')
        const uniqueRestaurants = [...new Set(AppointmentsData
          .filter(appointment => appointment.tableItems)
          .flatMap(appointment => appointment.tableItems)
          .map(item => item.restaurantName)
          .filter(name => name))
        ];
        
        setRestaurants(uniqueRestaurants);
        // Đặt nhà hàng đầu tiên làm mặc định
        if (uniqueRestaurants.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(uniqueRestaurants[0]);
        }
        setAppointments(AppointmentsData);
        calculateStats(AppointmentsData);
      } catch (error) {
        console.error('Error fetching Appointments:', error);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  // Add new useEffect for favorite products
  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        const usersRef = collection(db, 'USERS');
        const usersSnapshot = await getDocs(usersRef);
        
        const productCounts = {};
        
        // Count favorites
        usersSnapshot.docs.forEach(userDoc => {
          const userData = userDoc.data();
          if (userData.FavoriteProducts && Array.isArray(userData.FavoriteProducts)) {
            userData.FavoriteProducts.forEach(favorite => {
              const key = `${favorite.categoryId}_${favorite.productId}`;
              productCounts[key] = (productCounts[key] || 0) + 1;
            });
          }
        });

        // Get top 5 products
        const topProducts = await Promise.all(
          Object.entries(productCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(async ([key, count]) => {
              const [categoryId, productId] = key.split('_');
              const productRef = doc(db, 'menu', categoryId, 'product', productId);
              const productSnap = await getDoc(productRef);
              const productData = productSnap.data();
              
              return {
                name: productData?.name || 'Sản phẩm không tồn tại',
                count: count
              };
            })
        );

        // Update stats with favorite data
        setStats(prevStats => ({
          ...prevStats,
          favoriteData: {
            labels: topProducts.map(item => 
              item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name
            ),
            datasets: [{
              data: topProducts.map(item => item.count)
            }],
            maxValue: Math.max(...topProducts.map(item => item.count))
          }
        }));
      } catch (error) {
        console.error('Error fetching favorite products:', error);
      }
    };

    fetchFavoriteProducts();
  }, []); // Empty dependency array means this runs once when component mounts

  const calculateStats = (data) => {
    // Tính toán doanh thu theo ngày
    const revenueByDay = {};
    
    // Lọc các đơn hàng có totalPrice
    data.forEach(appointment => {
      if (appointment.totalPrice) {  // Đổi totalAmount thành totalPrice
        const day = moment(appointment.dateTime.toDate()).format('DD/MM/YYYY');  // Đổi date thành dateTime và thêm toDate()
        revenueByDay[day] = (revenueByDay[day] || 0) + appointment.totalPrice;  // Đổi totalAmount thành totalPrice
      }
    });

    // Cập nhật cách tính doanh thu theo ngày
    const startDate = moment(dateRange.startDate);
    const endDate = moment(dateRange.endDate);
    const dates = [];
    let currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate)) {
      dates.push(currentDate.format('DD/MM/YYYY'));
      currentDate.add(1, 'days');
    }

    const revenueData = {
      labels: dates.map(date => moment(date, 'DD/MM/YYYY').format('DD/MM')),
      datasets: [{
        data: dates.map(date => revenueByDay[date] || 0)
      }]
    };

    // Tính toán trạng thái đơn hàng
    const statusCount = {};
    data.forEach(appointment => {
      const status = appointment.status || 'Chưa xác định';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    // Tính toán món ăn phổ biến
    const dishCount = {};
    data.forEach(appointment => {
      if (appointment.otherItems && Array.isArray(appointment.otherItems)) {
        appointment.otherItems.forEach(item => {
          if (item.name) {
            dishCount[item.name] = (dishCount[item.name] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    const topDishes = Object.entries(dishCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const maxDishCount = Math.max(...topDishes.map(([,count]) => count));
    const dishesData = {
      labels: topDishes.length > 0 
        ? topDishes.map(([name]) => name.length > 10 ? name.substring(0, 10) + '...' : name)
        : ['Chưa có dữ liu'],
      datasets: [{
        data: topDishes.length > 0 
          ? topDishes.map(([,count]) => count)
          : [0]
      }],
      maxValue: maxDishCount
    };

    // Tính toán thống kê phòng
    const roomStats = {};
    data.forEach(appointment => {
      if (appointment.tableItems && Array.isArray(appointment.tableItems)) {
        // Lọc tableItems theo nhà hàng được chọn
        const filteredItems = selectedRestaurant === 'Tất cả' 
          ? appointment.tableItems 
          : appointment.tableItems.filter(item => item.restaurantName === selectedRestaurant);

        filteredItems.forEach(item => {
          if (item.name) {
            roomStats[item.name] = (roomStats[item.name] || 0) + 1;
          }
        });
      }
    });

    // Chuyển đổi dữ liệu phòng cho biểu đồ
    const topRooms = Object.entries(roomStats)
      .sort(([,a], [,b]) => b - a)  // Sắp xếp theo số lượt đặt giảm dần
      .slice(0, 5);  // Lấy top 5

    const maxRoomCount = Math.max(...topRooms.map(([,count]) => count), 1);
    const roomData = {
      labels: topRooms.length > 0 
        ? topRooms.map(([name]) => name)
        : ['Chưa có dữ liệu'],
      datasets: [{
        data: topRooms.length > 0 
          ? topRooms.map(([,count]) => count)
          : [0]
      }],
      maxValue: maxRoomCount || 1
    };

    const statusData = Object.entries(statusCount).map(([name, value]) => ({
      name,
      population: value,
      color: getStatusColor(name),
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));

    // Tính toán doanh thu theo tháng
    const revenueByMonth = {};
    data.forEach(appointment => {
      if (appointment.totalPrice) {
        const month = moment(appointment.dateTime.toDate()).format('MM/YYYY');
        revenueByMonth[month] = (revenueByMonth[month] || 0) + appointment.totalPrice;
      }
    });

    // Lấy 6 tháng gần nhất
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months').format('MM/YYYY');
      months.push(month);
    }

    const monthlyRevenueData = {
      labels: months.map(month => moment(month, 'MM/YYYY').format('T.MM/YY')),
      datasets: [{
        data: months.map(month => revenueByMonth[month] || 0)
      }]
    };

    setStats({
      revenueData,
      monthlyRevenueData,
      statusData,
      dishesData,
      roomData,
      // Keep existing favoriteData if it exists
      ...(stats?.favoriteData && { favoriteData: stats.favoriteData })
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Chưa nhận phòng': '#FFBB28', // Màu vàng
      'Đã nhận phòng': '#00C49F',   // Màu xanh lá
      'Đã nhận hàng': '#666666',    // Màu xám đậm
      'Chưa nhận hàng': '#999999',  // Màu xám nhạt
      'Chưa xác định': '#CCCCCC'    // Màu xám rất nhạt cho trường hợp khác
    };
    return colors[status] || '#CCCCCC';
  };

  // Cập nhật useEffect để theo dõi thay đổi của selectedRestaurant
  useEffect(() => {
    if (Appointments.length > 0) {
      calculateStats(Appointments);
    }
  }, [selectedRestaurant, Appointments]);


  const DateInput = ({ value, onChange, label }) => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.dateInputContainer}>
          <Text style={styles.dateLabel}>{label}</Text>
          <input
            type="date"
            value={moment(value).format('YYYY-MM-DD')}
            onChange={(e) => {
              const date = new Date(e.target.value);
              onChange(date);
              if (Appointments.length > 0) {
                calculateStats(Appointments);
              }
            }}
            style={{
              padding: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#ddd',
              backgroundColor: '#f5f5f5',
              width: 130,
              fontSize: 14,
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.dateInputContainer}>
        <Text style={styles.dateLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => {/* mobile date picker logic */}}
        >
          <Text>{moment(value).format('DD/MM/YYYY')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Thêm state tạm thời cho việc chọn ngày
  const [tempDateRange, setTempDateRange] = useState({
    startDate: moment().subtract(6, 'days').toDate(),
    endDate: new Date()
  });

  // Hàm xử lý khi bấm nút xem thống kê
  const handleViewStats = () => {
    setDateRange(tempDateRange);
    if (Appointments.length > 0) {
      calculateStats(Appointments);
    }
  };

  // Thêm state để lưu thống kê tổng quan
  const [summaryStats, setSummaryStats] = useState({
    totalUsers: 0,
    todayOrders: 0,
    totalProducts: 0,
    monthlyRevenue: 0
  });
  // Thêm state loading
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoading(true); // Bắt đầu loading
      try {
        const db = getFirestore(app);
        
        // Đếm tổng người dùng từ collection "users"
        const usersRef = collection(db, "USERS");
        const usersSnapshot = await getDocs(usersRef);
        const totalUsers = usersSnapshot.size;

        // Lấy tổng sản phẩm từ các menu
        const productsRef = collection(db, "menu");
        let totalProducts = 0;
        const menuSnapshot = await getDocs(productsRef);
        for (const menuDoc of menuSnapshot.docs) {
          const productsInMenuRef = collection(db, "menu", menuDoc.id, "product");
          const productsSnapshot = await getDocs(productsInMenuRef);
          totalProducts += productsSnapshot.size;
        }

        // Lấy đơn hàng và tính doanh thu từ collection "Appointments"
        const appointmentsRef = collection(db, "Appointments");
        const appointmentsSnapshot = await getDocs(appointmentsRef);
        const appointments = appointmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.dateTime
          };
        });

        // Tính đơn hàng hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = appointments.filter(app => {
          if (!app?.dateTime) return false;
          const appDate = app.dateTime.toDate();
          appDate.setHours(0, 0, 0, 0);
          return appDate.getTime() === today.getTime();
        }).length;

        // Tính doanh thu tháng này
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthlyRevenue = appointments.reduce((total, app) => {
          if (!app?.dateTime) return total;
          const appDate = app.dateTime.toDate();
          if (appDate.getMonth() === currentMonth && 
              appDate.getFullYear() === currentYear) {
            const price = parseInt(app.totalPrice) || 0;
            return total + price;
          }
          return total;
        }, 0);

        setSummaryStats(prev => ({
          ...prev,
          totalUsers,
          todayOrders,
          totalProducts,
          monthlyRevenue
        }));

      } catch (error) {
        console.error("Error fetching counts:", error);
        setSummaryStats(prev => ({
          ...prev,
          totalUsers: 0,
          todayOrders: 0,
          totalProducts: 0,
          monthlyRevenue: 0
        }));
      } finally {
        setIsLoading(false); // Kết thúc loading
      }
    };

    fetchCounts();
  }, []);

  if (loading || !stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tổng người dùng</Text>
          <Text style={styles.summaryValue}>
            {isLoading ? "Đang tải..." : summaryStats.totalUsers}
          </Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Đơn hàng hôm nay</Text>
          <Text style={styles.summaryValue}>
            {isLoading ? "Đang tải..." : summaryStats.todayOrders}
          </Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tổng sản phẩm</Text>
          <Text style={styles.summaryValue}>
            {isLoading ? "Đang tải..." : summaryStats.totalProducts}
          </Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Doanh thu tháng này</Text>
          <Text style={styles.summaryValue}>
            {isLoading ? "Đang tải..." : new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(summaryStats.monthlyRevenue)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.gridContainer}>
          {/* Biểu đồ 1 - Doanh thu */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Doanh thu theo ngày (nghìn đồng)</Text>
            
            <View style={styles.datePickerContainer}>
              <DateInput
                label="Từ:"
                value={tempDateRange.startDate}
                onChange={(date) => {
                  setTempDateRange(prev => ({
                    ...prev,
                    startDate: date
                  }));
                }}
              />

              <DateInput
                label="Đến:"
                value={tempDateRange.endDate}
                onChange={(date) => {
                  setTempDateRange(prev => ({
                    ...prev,
                    endDate: date
                  }));
                }}
              />

              <TouchableOpacity 
                style={styles.viewStatsButton}
                onPress={handleViewStats}
              >
                <Text style={styles.viewStatsButtonText}>Xem thống kê</Text>
              </TouchableOpacity>
            </View>

            <LineChart
              data={stats.revenueData}
              width={screenWidth * 0.45}  // Giảm kích thước xuống
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#ffa726'
                }
              }}
              bezier
              style={styles.chart}
              withDots={false}
            />
          </View>

          {/* Biểu đồ 2 - Trạng thái đơn hàng */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Trạng thái đơn hàng</Text>
            <PieChart
              data={stats.statusData}
              width={screenWidth * 0.45}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
              absolute
            />
          </View>

          {/* Biểu đồ 3 - Top 5 món ăn */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Top 5 món ăn phổ biến</Text>
            <BarChart
              data={stats.dishesData}
              width={screenWidth * 0.45}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              withHorizontalLabels={true}    // Hiện trục y
              withVerticalLabels={true}      // Hiện trục y
              withHorizontalLines={true}     // Hiện đường kẻ ngang
              withInnerLines={true}          // Hiện đường kẻ trong
              withOuterLines={true}          // Hiện đường kẻ ngoài
              withDots={false}               // Không hiện dots
              withCustomBarColorFromData={false}
              flatColor={true}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.7,
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: 'bold'
                },
                propsForVerticalLabels: {   // Style cho nhãn trục y
                  fontSize: 12,
                  fontWeight: '500'
                },
                propsForBackgroundLines: {  // Style cho đường kẻ ngang
                  strokeWidth: 1,
                  strokeDasharray: [],
                  stroke: '#e0e0e0'
                }
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 0,
                paddingLeft: 0,
              }}
              showValuesOnTopOfBars={true}
              fromZero={true}
              horizontalLabelRotation={0}  // Không xoay nhãn ngang
              verticalLabelRotation={0}    // Không xoay nhãn dọc
              showBarTops={false}          // Không hiện đỉnh cột
              segments={4}                 // Số đoạn chia trục y
            />
          </View>

          {/* Biểu đồ 4 - Top 5 phòng */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Top 5 phòng được đặt nhiều nhất</Text>
            
            {/* Dropdown chọn nhà hàng */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Chọn nhà hàng:</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={selectedRestaurant}
                  onValueChange={(itemValue) => {
                    setSelectedRestaurant(itemValue);
                  }}
                  style={styles.pickerStyle}
                >
                  {restaurants.map((restaurant, index) => (
                    <Picker.Item 
                      key={index} 
                      label={restaurant} 
                      value={restaurant}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <BarChart
              data={stats?.roomData || defaultChartData}
              width={screenWidth * 0.45}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              withHorizontalLabels={true}    // Hiện trục y
              withVerticalLabels={true}      // Hiện trục y
              withHorizontalLines={true}     // Hiện đường kẻ ngang
              withInnerLines={true}          // Hiện đường kẻ trong
              withOuterLines={true}          // Hiện đường kẻ ngoài
              withDots={false}               // Không hiện dots
              withCustomBarColorFromData={false}
              flatColor={true}
              xLabelsOffset={-10}           // Điều chỉnh vị trí nhãn x
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                barPercentage: 0.7,
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: 'bold'
                },
                propsForVerticalLabels: {   // Style cho nhãn trục y
                  fontSize: 12,
                  fontWeight: '500'
                },
                propsForBackgroundLines: {  // Style cho đường kẻ ngang
                  strokeWidth: 1,
                  strokeDasharray: [],
                  stroke: '#e0e0e0'
                }
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 0,           // Giảm padding bên phải
                paddingLeft: 0,            // Giảm padding bên trái
              }}
              showValuesOnTopOfBars={true}
              fromZero={true}
              horizontalLabelRotation={0}  // Không xoay nhãn ngang
              verticalLabelRotation={0}    // Không xoay nhãn dọc
              showBarTops={false}          // Không hiện đỉnh cột
              segments={4}                 // Số đoạn chia trục y
            />
          </View>

          {/* Biểu đồ 5 - Doanh thu theo tháng */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Doanh thu theo tháng (nghìn đồng)</Text>
            <LineChart
              data={stats.monthlyRevenueData}
              width={screenWidth * 0.45}
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // Màu hồng
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#ffa726'
                },
                propsForLabels: {
                  fontSize: 10, // Giảm font size vì không gian nhỏ
                  fontWeight: 'bold'
                }
              }}
              bezier
              style={styles.chart}
              withDots={false}
              formatYLabel={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value;
              }}
            />
          </View>

          {/* Biểu đồ 6 - Top 5 sản phẩm yêu thích */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Top 5 sản phẩm được yêu thích</Text>
            <BarChart
              data={stats?.favoriteData || defaultChartData}
              width={screenWidth * 0.45}
              height={180}
              yAxisLabel=""
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                barPercentage: 0.7,
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: 'bold'
                },
                count: (stats?.favoriteData?.maxValue || 1) + 1,
                stepSize: 1,
                formatYLabel: (value) => {
                  return Math.floor(value) === value ? value.toString() : '';
                }
              }}
              style={styles.chart}
              showValuesOnTopOfBars={true}
              fromZero={true}
              segments={stats?.favoriteData?.maxValue || 1}
              horizontalLabelRotation={45}
              verticalLabelRotation={0}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  chartBox: {
    width: '48%', // Để tạo khoảng cách giữa các box
    backgroundColor: '#fff',
    margin: 4,
    padding: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  chart: {
    borderRadius: 12,
    marginVertical: 4,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  dropdownLabel: {
    fontSize: 14,
    marginRight: 8,
    color: '#333',
  },
  picker: {
    flex: 1,
    height: 35,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerStyle: {
    height: 35,
    backgroundColor: 'transparent',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 8,
    gap: 10, // Tạo khoảng cách đều giữa các phần tử
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#333',
  },
  dateInput: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: 100,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pickerScroll: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  pickerItem: {
    padding: 10,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#007AFF',
  },
  pickerText: {
    fontSize: 16,
  },
  pickerTextSelected: {
    fontSize: 16,
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewStatsButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  viewStatsButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    width: '23%', // Để tạo 4 cột
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});