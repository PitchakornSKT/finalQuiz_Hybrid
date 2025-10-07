import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Post } from '../types';


export default function PostCard({ post, onLike, onOpenComments }: { post: Post; onLike: (id: string) => void; onOpenComments: () => void }) {
return (
<View style={{ backgroundColor: '#fff', padding: 12, marginVertical: 8 }}>
<Text style={{ fontWeight: '700' }}>{post.author}</Text>
<Text style={{ marginVertical: 8 }}>{post.text}</Text>
<View style={{ flexDirection: 'row', gap: 8 }}>
<TouchableOpacity onPress={() => onLike(post.id)}><Text>{post.liked ? 'Unlike' : 'Like'} ({post.likes})</Text></TouchableOpacity>
<TouchableOpacity onPress={onOpenComments}><Text>Comments ({post.comments.length})</Text></TouchableOpacity>
</View>
</View>
);
}