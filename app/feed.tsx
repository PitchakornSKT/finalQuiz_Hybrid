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
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import useAuth from '../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function FeedScreen() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [year, setYear] = useState('2565'); 
  const [students, setStudents] = useState<any[]>([]);
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set()); // Track currently liking posts

  const API_KEY = '51bd9c1b9b33adc23964465d24add4a9cc0e2c04589a35d65ef6a872f38ff585';
  const BASE_URL = 'https://cis.kku.ac.th/api/classroom';

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
          // นับจำนวน like จริงจาก array
          const likeCount = post.like && Array.isArray(post.like) ? post.like.length : 0;
          
          // ตรวจสอบว่า user ปัจจุบันได้ไลค์โพสต์นี้แล้วหรือไม่
          let hasLiked = false;
          if (post.like && Array.isArray(post.like) && user) {
            hasLiked = post.like.some((like: any) => {
              return like && like._id === user._id;
            });
          }

          console.log(`❤️ Post ${post._id?.substring(0, 8)}: User ${user?._id?.substring(0, 8)} vs Like IDs: ${post.like?.map((l: any) => l?._id?.substring(0, 8))} = ${hasLiked}`);
          
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
      console.log(`❤️ Toggling like for post: ${statusId}`);
      
      // Add to currently liking set
      setLikingPosts(prev => new Set(prev).add(statusId));
      
      // Find current post state
      const currentPost = posts.find(post => post._id === statusId);
      const currentHasLiked = currentPost?.hasLiked || false;
      const currentLikeCount = currentPost?.likeCount || 0;

      // 🔥 Optimistic update - อัพเดท UI ทันที
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === statusId 
            ? {
                ...post,
                hasLiked: !currentHasLiked, // สลับสถานะทันที
                likeCount: currentHasLiked ? (currentLikeCount - 1) : (currentLikeCount + 1) // อัพเดทจำนวนทันที
              }
            : post
        )
      );

      // เรียก API like ตาม docs ที่ถูกต้อง
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

      console.log('Like API Response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.log('Like API Error:', errorData);
        throw new Error(errorData.message || 'ไม่สามารถกดไลค์ได้');
      }

      const data = await res.json();
      console.log('Like API Success:', data);
      
    } catch (err: any) { 
      console.error('Like error:', err);
      // Rollback ถ้าเกิดข้อผิดพลาด
      fetchPosts();
      Alert.alert('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถกดไลค์ได้ในขณะนี้');
    } finally {
      // Remove from currently liking set
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(statusId);
        return newSet;
      });
      
      // โหลดข้อมูลใหม่เพื่อความถูกต้อง
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

  // ---------------- Delete post (ลบได้ทุกโพสต์) ----------------
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

  // ---------------- Delete comment (ลบได้ทุกคอมเมนต์) ----------------
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
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ชุมชนนักศึกษา</Text>
          <Text style={styles.headerSubtitle}>แบ่งปันความคิดเห็นและอัพเดท</Text>
        </View>

        {/* Year Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ดูนักศึกษาตามปี</Text>
          <View style={styles.pickerContainer}>
            <Picker 
              selectedValue={year} 
              onValueChange={(itemValue) => setYear(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="2563" value="2563" />
              <Picker.Item label="2564" value="2564" />
              <Picker.Item label="2565" value="2565" />
              <Picker.Item label="2566" value="2566" />
            </Picker>
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
              renderItem={({ item }) => (
                <View style={styles.studentCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.firstname && item.firstname.charAt(0)}
                    </Text>
                  </View>
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
            />
            <TouchableOpacity 
              onPress={handlePost} 
              style={[
                styles.button, 
                !newPost.trim() && styles.buttonDisabled
              ]}
              disabled={!newPost.trim()}
            >
              <Text style={styles.buttonText}>โพสต์</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>โพสต์ล่าสุด</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#CCCCCC" />
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
                  {/* ส่วนหัวโพสต์กับปุ่มลบ */}
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.postAvatar}>
                        <Text style={styles.postAvatarText}>
                          {item.createdBy.firstname ? item.createdBy.firstname.charAt(0) : item.createdBy.email.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.name}>
                          {item.createdBy.firstname ? `${item.createdBy.firstname} ${item.createdBy.lastname}` : item.createdBy.email}
                        </Text>
                        <Text style={styles.timestamp}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </View>
                    
                    {/* 🗑️ ปุ่มลบโพสต์ - แสดงทุกโพสต์ */}
                    <TouchableOpacity 
                      onPress={() => deletePost(item._id)}
                      style={styles.deletePostButton}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                      <Text style={styles.deletePostButtonText}>ลบโพสต์</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.content}>{item.content}</Text>

                  {/* Actions - Like และ Comment Count */}
                  <View style={styles.actions}>
                    <TouchableOpacity 
                      onPress={() => toggleLike(item._id)} 
                      style={[
                        styles.likeButton,
                        likingPosts.has(item._id) && styles.likeButtonLoading
                      ]}
                      disabled={likingPosts.has(item._id)}
                    >
                      {likingPosts.has(item._id) ? (
                        // Show loading indicator while liking
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        // Show heart icon
                        <Ionicons 
                          name={item.hasLiked ? "heart" : "heart-outline"} 
                          size={22} 
                          color={item.hasLiked ? "#FF3B30" : "#666"} 
                        />
                      )}
                      <Text style={[
                        styles.likeText,
                        item.hasLiked && styles.likedText
                      ]}>
                        {item.likeCount || 0}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.commentCount}>
                      <Ionicons name="chatbubble-outline" size={20} color="#666" />
                      <Text style={styles.commentCountText}>{item.comment?.length || 0}</Text>
                    </View>
                  </View>

                  {/* Comments */}
                  {item.comment && item.comment.length > 0 && (
                    <View style={styles.commentsContainer}>
                      <Text style={styles.commentsTitle}>ความคิดเห็น:</Text>
                      {item.comment.map((c: any) => (
                        <View key={c._id} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentName}>
                              {c.createdBy.firstname ? `${c.createdBy.firstname} ${c.createdBy.lastname}` : c.createdBy.email}:
                            </Text>
                            
                            {/* ❌ ปุ่มลบคอมเมนต์ - แสดงทุกคอมเมนต์ */}
                            <TouchableOpacity 
                              onPress={() => deleteComment(c._id, item._id)}
                              style={styles.deleteCommentButton}
                            >
                              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                              <Text style={styles.deleteCommentButtonText}>ลบ</Text>
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
                    />
                    <TouchableOpacity 
                      onPress={() => addComment(item._id)}
                      style={[
                        styles.commentButton,
                        (!commentInputs[item._id] || !commentInputs[item._id].trim()) && styles.commentButtonDisabled
                      ]}
                      disabled={!commentInputs[item._id] || !commentInputs[item._id].trim()}
                    >
                      <Text style={styles.commentButtonText}>ส่ง</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E9F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    backgroundColor: '#F7FAFC',
  },
  studentsContainer: {
    marginTop: 8,
  },
  studentCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentName: {
    fontSize: 12,
    color: '#4A5568',
    textAlign: 'center',
  },
  postBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F7FAFC',
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  userDetails: {
    flex: 1,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4C51BF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    color: '#2D3748',
  },
  timestamp: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  // ปุ่มลบโพสต์
  deletePostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53E3E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  deletePostButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4A5568',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  likeButtonLoading: {
    opacity: 0.7,
  },
  likeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentCountText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  commentsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  commentItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  commentName: {
    fontWeight: '500',
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  // ปุ่มลบคอมเมนต์
  deleteCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53E3E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteCommentButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 18,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F7FAFC',
    minHeight: 40,
  },
  commentButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  commentButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 4,
  },
});