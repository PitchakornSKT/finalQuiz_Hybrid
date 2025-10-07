import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import useAuth from '../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function FeedScreen() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [year, setYear] = useState('2565'); 
  const [students, setStudents] = useState<any[]>([]);
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [scaleAnim] = useState(new Animated.Value(1));

  const API_KEY = '51bd9c1b9b33adc23964465d24add4a9cc0e2c04589a35d65ef6a872f38ff585';
  const BASE_URL = 'https://cis.kku.ac.th/api/classroom';

  // ---------------- Animation for like button ----------------
  const animateLike = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ---------------- Fetch posts ----------------
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/status`, {
        headers: { 
          accept: 'application/json', 
          'x-api-key': API_KEY, 
          Authorization: `Bearer ${token}` 
        },
      });
      const data = await res.json();
      
      if (data.data && Array.isArray(data.data)) {
        const postsWithOwnership = data.data.reverse().map((post: any) => {
          const likeCount = post.like && Array.isArray(post.like) ? post.like.length : 0;
          
          let hasLiked = false;
          if (post.like && Array.isArray(post.like) && user) {
            hasLiked = post.like.some((like: any) => {
              return like && like._id === user._id;
            });
          }
          
          return {
            ...post,
            canDelete: true,
            hasLiked: hasLiked,
            likeCount: likeCount,
            comment: post.comment ? post.comment.map((comment: any) => ({
              ...comment,
              canDelete: true
            })) : []
          };
        });
        setPosts(postsWithOwnership);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'โหลดโพสต์ไม่สำเร็จ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ---------------- Fetch students by year ----------------
  const fetchStudents = async (selectedYear: string) => {
    try {
      const res = await fetch(`${BASE_URL}/class/${selectedYear}`, {
        headers: { accept: 'application/json', 'x-api-key': API_KEY, Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStudents(data.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'โหลดรายชื่อนักศึกษาไม่สำเร็จ');
    }
  };

  useEffect(() => {
    if (token) {
      fetchPosts();
      fetchStudents(year);
    }
  }, [year, token]);

  // ---------------- Refresh ----------------
  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // ---------------- Post status ----------------
  const handlePost = async () => {
    if (!newPost.trim()) return Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อความ');
    try {
      const res = await fetch(`${BASE_URL}/status`, {
        method: 'POST',
        headers: { 
          accept: 'application/json', 
          'Content-Type': 'application/json', 
          'x-api-key': API_KEY, 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ content: newPost }),
      });
      const data = await res.json();
      if (res.ok) { 
        setNewPost(''); 
        fetchPosts(); 
        Alert.alert('สำเร็จ', 'โพสต์ของคุณถูกเผยแพร่แล้ว');
      } 
      else Alert.alert('Error', data.error || 'โพสต์ไม่สำเร็จ');
    } catch (err) { 
      console.error(err); 
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโพสต์ได้ในขณะนี้');
    }
  };

  // ---------------- Toggle like ----------------
  const toggleLike = async (statusId: string) => {
    try {
      setLikingPosts(prev => new Set(prev).add(statusId));
      
      const currentPost = posts.find(post => post._id === statusId);
      const currentHasLiked = currentPost?.hasLiked || false;
      const currentLikeCount = currentPost?.likeCount || 0;

      // Animate like button
      animateLike();

      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === statusId 
            ? {
                ...post,
                hasLiked: !currentHasLiked,
                likeCount: currentHasLiked ? (currentLikeCount - 1) : (currentLikeCount + 1)
              }
            : post
        )
      );

      const res = await fetch(`${BASE_URL}/like`, { 
        method: 'POST', 
        headers: { 
          accept: 'application/json', 
          'Content-Type': 'application/json',
          'x-api-key': API_KEY, 
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          statusId: statusId
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'ไม่สามารถกดไลค์ได้');
      }

      const data = await res.json();
      
    } catch (err: any) { 
      console.error('Like error:', err);
      fetchPosts();
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(statusId);
        return newSet;
      });
      fetchPosts();
    }
  };

  // ---------------- Update comment input ----------------
  const updateCommentInput = (statusId: string, text: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [statusId]: text
    }));
  };

  // ---------------- Add comment ----------------
  const addComment = async (statusId: string) => {
    const text = commentInputs[statusId] || '';
    
    if (!text.trim()) return;

    try {
      const res = await fetch(`${BASE_URL}/comment`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text, statusId }),
      });

      const data = await res.json();

      if (res.ok) {
        updateCommentInput(statusId, '');
        fetchPosts();
      } else {
        Alert.alert('Error', data.error || 'คอมเมนต์ไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มคอมเมนต์ได้ในขณะนี้');
    }
  };

  // ---------------- Delete post ----------------
  const deletePost = async (id: string) => {
    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบโพสต์นี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/status/${id}`, {
              method: 'DELETE',
              headers: { 
                accept: 'application/json', 
                'x-api-key': API_KEY, 
                Authorization: `Bearer ${token}` 
              },
            });
            
            if (res.ok) {
              fetchPosts();
              Alert.alert('สำเร็จ', 'ลบโพสต์เรียบร้อยแล้ว');
            } else {
              const data = await res.json();
              Alert.alert('Error', data.error || 'ลบโพสต์ไม่สำเร็จ');
            }
          } catch (err) {
            console.error(err);
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบโพสต์ได้ในขณะนี้');
          }
        },
      },
    ]);
  };

  // ---------------- Delete comment ----------------
  const deleteComment = async (commentId: string, statusId: string) => {
    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบคอมเมนต์นี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/comment/${commentId}`, {
              method: 'DELETE',
              headers: { 
                accept: 'application/json', 
                'x-api-key': API_KEY, 
                Authorization: `Bearer ${token}` 
              },
            });

            let data;
            try {
              data = await res.json();
            } catch (err) {
              data = null;
            }

            if (res.ok) {
              fetchPosts();
              Alert.alert('สำเร็จ', data?.message || 'ลบคอมเมนต์เรียบร้อยแล้ว');
            } else {
              Alert.alert('Error', data?.error || 'ลบคอมเมนต์ไม่สำเร็จ');
            }
          } catch (err) {
            console.error(err);
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบคอมเมนต์ได้ในขณะนี้');
          }
        },
      },
    ]);
  };

  // ---------------- Format date ----------------
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#F2F2F7', '#FFFFFF']}
        style={styles.background}
      >
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#FFFFFF', '#F2F2F7']}
              style={styles.headerBackground}
            >
              <Text style={styles.headerTitle}>ชุมชนนักศึกษา</Text>
              <Text style={styles.headerSubtitle}>แบ่งปันความคิดเห็นและอัพเดท</Text>
            </LinearGradient>
          </View>

          {/* Year Picker Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ดูนักศึกษาตามปี</Text>
            <View style={styles.pickerContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.pickerBackground}
              >
                <Picker 
                  selectedValue={year} 
                  onValueChange={(itemValue) => setYear(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#007AFF"
                >
                  <Picker.Item label="2563" value="2563" />
                  <Picker.Item label="2564" value="2564" />
                  <Picker.Item label="2565" value="2565" />
                  <Picker.Item label="2566" value="2566" />
                </Picker>
              </LinearGradient>
            </View>
          </View>

          {/* Students List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>สมาชิกปี {year}</Text>
            <View style={styles.studentsContainer}>
              <FlatList
                data={students}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View style={styles.studentCard}>
                    <LinearGradient
                      colors={['#007AFF', '#5856D6']}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>
                        {item.firstname && item.firstname.charAt(0)}
                      </Text>
                    </LinearGradient>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {item.firstname} {item.lastname}
                    </Text>
                  </View>
                )}
              />
            </View>
          </View>

          {/* Create Post */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>สร้างโพสต์ใหม่</Text>
            <View style={styles.postBox}>
              <TextInput 
                placeholder="คุณคิดอะไรอยู่..." 
                value={newPost} 
                onChangeText={setNewPost} 
                style={styles.input} 
                multiline
                placeholderTextColor="#8E8E93"
              />
              <TouchableOpacity 
                onPress={handlePost} 
                style={[
                  styles.button, 
                  !newPost.trim() && styles.buttonDisabled
                ]}
                disabled={!newPost.trim()}
              >
                <LinearGradient
                  colors={!newPost.trim() ? ['#C7C7CC', '#AEAEB2'] : ['#007AFF', '#5856D6']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>โพสต์</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Posts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>โพสต์ล่าสุด</Text>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={80} color="#C7C7CC" />
                <Text style={styles.emptyStateText}>ยังไม่มีโพสต์</Text>
                <Text style={styles.emptyStateSubtext}>เป็นคนแรกที่แบ่งปันความคิดเห็น</Text>
              </View>
            ) : (
              <FlatList
                data={posts}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.userInfo}>
                        <LinearGradient
                          colors={['#007AFF', '#5856D6']}
                          style={styles.postAvatar}
                        >
                          <Text style={styles.postAvatarText}>
                            {item.createdBy.firstname ? item.createdBy.firstname.charAt(0) : item.createdBy.email.charAt(0)}
                          </Text>
                        </LinearGradient>
                        <View style={styles.userDetails}>
                          <Text style={styles.name}>
                            {item.createdBy.firstname ? `${item.createdBy.firstname} ${item.createdBy.lastname}` : item.createdBy.email}
                          </Text>
                          <Text style={styles.timestamp}>
                            {formatDate(item.createdAt)}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Delete Button */}
                      <TouchableOpacity 
                        onPress={() => deletePost(item._id)}
                        style={styles.deletePostButton}
                      >
                        <Ionicons name="trash" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Post Content */}
                    <Text style={styles.content}>{item.content}</Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                      <TouchableOpacity 
                        onPress={() => toggleLike(item._id)} 
                        style={[
                          styles.likeButton,
                          likingPosts.has(item._id) && styles.likeButtonLoading
                        ]}
                        disabled={likingPosts.has(item._id)}
                      >
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                          {likingPosts.has(item._id) ? (
                            <ActivityIndicator size="small" color="#FF2D55" />
                          ) : (
                            <Ionicons 
                              name={item.hasLiked ? "heart" : "heart-outline"} 
                              size={24} 
                              color={item.hasLiked ? "#FF2D55" : "#8E8E93"} 
                            />
                          )}
                        </Animated.View>
                        <Text style={[
                          styles.likeText,
                          item.hasLiked && styles.likedText
                        ]}>
                          {item.likeCount || 0}
                        </Text>
                      </TouchableOpacity>
                      
                      <View style={styles.commentCount}>
                        <Ionicons name="chatbubble-outline" size={20} color="#8E8E93" />
                        <Text style={styles.commentCountText}>{item.comment?.length || 0}</Text>
                      </View>
                    </View>

                    {/* Comments */}
                    {item.comment && item.comment.length > 0 && (
                      <View style={styles.commentsContainer}>
                        <Text style={styles.commentsTitle}>ความคิดเห็น</Text>
                        {item.comment.map((c: any) => (
                          <View key={c._id} style={styles.commentItem}>
                            <View style={styles.commentHeader}>
                              <View style={styles.commentUser}>
                                <Text style={styles.commentName}>
                                  {c.createdBy.firstname ? `${c.createdBy.firstname} ${c.createdBy.lastname}` : c.createdBy.email}
                                </Text>
                                <Text style={styles.commentTime}>
                                  {formatDate(c.createdAt)}
                                </Text>
                              </View>
                              
                              <TouchableOpacity 
                                onPress={() => deleteComment(c._id, item._id)}
                                style={styles.deleteCommentButton}
                              >
                                <Ionicons name="close" size={16} color="#FF3B30" />
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.commentText}>{c.content}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Add Comment */}
                    <View style={styles.addCommentContainer}>
                      <TextInput 
                        placeholder="เขียนความคิดเห็น..." 
                        value={commentInputs[item._id] || ''}
                        onChangeText={(text) => updateCommentInput(item._id, text)}
                        style={styles.commentInput} 
                        multiline
                        placeholderTextColor="#8E8E93"
                      />
                      <TouchableOpacity 
                        onPress={() => addComment(item._id)}
                        style={[
                          styles.commentButton,
                          (!commentInputs[item._id] || !commentInputs[item._id].trim()) && styles.commentButtonDisabled
                        ]}
                        disabled={!commentInputs[item._id] || !commentInputs[item._id].trim()}
                      >
                        <LinearGradient
                          colors={(!commentInputs[item._id] || !commentInputs[item._id].trim()) ? ['#C7C7CC', '#AEAEB2'] : ['#34C759', '#30D158']}
                          style={styles.commentButtonGradient}
                        >
                          <Text style={styles.commentButtonText}>ส่ง</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    backgroundColor: 'transparent',
  },
  headerBackground: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '400',
  },
  section: {
    backgroundColor: 'transparent',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    marginLeft: 4,
  },
  pickerContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerBackground: {
    borderRadius: 14,
  },
  picker: {
    backgroundColor: 'transparent',
    height: 50,
  },
  studentsContainer: {
    marginTop: 8,
  },
  studentCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  studentName: {
    fontSize: 12,
    color: '#1C1C1E',
    textAlign: 'center',
    fontWeight: '500',
  },
  postBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
    color: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    shadowColor: '#C7C7CC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  postAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  deletePostButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1C1E',
    marginBottom: 16,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  likeButtonLoading: {
    opacity: 0.7,
  },
  likeText: {
    marginLeft: 6,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  likedText: {
    color: '#FF2D55',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  commentCountText: {
    marginLeft: 6,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  commentsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  commentItem: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  commentUser: {
    flex: 1,
  },
  commentName: {
    fontWeight: '500',
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteCommentButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#F2F2F7',
    minHeight: 40,
    color: '#1C1C1E',
  },
  commentButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  commentButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  commentButtonDisabled: {
    opacity: 0.6,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
  },
});