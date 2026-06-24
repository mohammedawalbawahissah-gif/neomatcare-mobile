/**
 * src/components/ai/AssistantWidget.jsx  (mobile — Expo / React Native)
 *
 * Floating role-aware AI assistant widget.
 * Renders as a FAB → bottom-sheet chat panel.
 *
 * Usage:
 *   Mount once inside each tab's root screen, OR mount globally in app/(tabs)/_layout.jsx
 *   using an overlay View with pointerEvents="box-none":
 *
 *   <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
 *     <AssistantWidget context={{ page: 'cases' }} />
 *   </View>
 *
 * Props:
 *   context {object} - Optional page-level context sent with every chat message
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Animated, Keyboard, Platform, ActivityIndicator,
  KeyboardAvoidingView, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { aiApi } from '../../api/ai'

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  health_worker:  { label: 'Clinical Assistant',   color: '#207652', greeting: "Hi! I'm your clinical assistant. Ask me about danger signs, triage, referrals, or the platform." },
  facility_admin: { label: 'Facility Assistant',   color: '#2563eb', greeting: "Hi! I can help with facility operations, capacity, and referral management." },
  specialist:     { label: 'Specialist Assistant', color: '#7c3aed', greeting: "Hello. I can assist with case review, consultation notes, and clinical protocols." },
  driver:         { label: 'Dispatch Assistant',   color: '#d97706', greeting: "Hi! I can help with dispatch info, transport protocols, and status updates." },
  superadmin:     { label: 'Admin Assistant',      color: '#e43418', greeting: "Hello. I can assist with any NeoMatCare operation or administration." },
  patient:        { label: 'Pregnancy Companion',  color: '#16a34a', greeting: "Hi there! 💚 I'm here to support your pregnancy journey. Ask me anything about your health or ANC visits." },
}
const DEFAULT_CONFIG = ROLE_CONFIG.health_worker

// ── Quick prompts per role ────────────────────────────────────────────────────
const QUICK_PROMPTS = {
  health_worker:  ['Signs of eclampsia?', 'How to escalate PPH?', 'Creating a referral'],
  facility_admin: ['Update facility capacity', 'Referral status meanings', 'Add transport vehicle'],
  specialist:     ['Review a referral', 'Update consultation status', 'Neonatal sepsis signs'],
  driver:         ['I got a new dispatch', 'Update trip status', 'Patient unwell in transit'],
  superadmin:     ['Manage users', 'Add new facility', 'Referral statuses explained'],
  patient:        ['What to eat during pregnancy?', 'When to go to hospital?', 'Next ANC visit'],
}

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = React.memo(({ msg, accentColor }) => {
  const isUser = msg.role === 'user'
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: accentColor }]}>
          <Ionicons name="heart" size={12} color="#fff" />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? [styles.bubbleUser, { backgroundColor: accentColor }] : styles.bubbleAI
      ]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {msg.content}
        </Text>
      </View>
    </View>
  )
})

// ── Main widget ───────────────────────────────────────────────────────────────
export default function AssistantWidget({ context = {} }) {
  const { user } = useAuth()
  const role   = user?.role || 'health_worker'
  const config = ROLE_CONFIG[role] || DEFAULT_CONFIG
  const prompts = QUICK_PROMPTS[role] || QUICK_PROMPTS.health_worker
  const insets  = useSafeAreaInsets()

  const [open,    setOpen]    = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: config.greeting },
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const listRef  = useRef(null)
  const slideAnim = useRef(new Animated.Value(0)).current

  // Animate panel in/out
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }, [open])

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  useEffect(() => { if (open) scrollToEnd() }, [messages, open])

  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg = { role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setError('')
    setLoading(true)
    Keyboard.dismiss()

    // Build API messages excluding the greeting
    const apiMessages = updated
      .filter((_, i) => !(i === 0 && updated[0].role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const { data } = await aiApi.chat(apiMessages, {
        ...context,
        user_role: role,
        user_name: user?.name,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not reach AI assistant. Try again.'
      setError(msg)
      setMessages(prev => prev.slice(0, -1))
      setInput(content)
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, context, role, user])

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: config.greeting }])
    setError('')
    setInput('')
  }

  const panelTranslateY = slideAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [600, 0],
  })

  const fabBottom = insets.bottom + 16

  return (
    <>
      {/* ── Chat panel overlay ───────────────────────────────────────────── */}
      {open && (
        <Pressable
          style={styles.backdrop}
          onPress={() => { setOpen(false); Keyboard.dismiss() }}
        />
      )}

      <Animated.View
        style={[
          styles.panel,
          {
            bottom: fabBottom + 64,
            transform: [{ translateY: panelTranslateY }],
            opacity: slideAnim,
          },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Panel header */}
        <View style={[styles.panelHeader, { backgroundColor: config.color }]}>
          <View style={[styles.panelHeaderIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="heart" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>{config.label}</Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOpen(false)} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <MessageBubble msg={item} accentColor={config.color} />
          )}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <View style={[styles.avatar, { backgroundColor: config.color }]}>
                  <Ionicons name="heart" size={12} color="#fff" />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={config.color} />
                </View>
              </View>
            ) : error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#e43418" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
        />

        {/* Quick prompts */}
        <View style={styles.quickPrompts}>
          {prompts.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => sendMessage(p)}
              disabled={loading}
              style={styles.quickChip}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything…"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
              maxLength={500}
              editable={!loading}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={[styles.sendBtn, { backgroundColor: config.color, opacity: (!input.trim() || loading) ? 0.4 : 1 }]}
            >
              <Ionicons name="send" size={15} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>AI may make mistakes. Always verify clinical decisions.</Text>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        style={[styles.fab, { bottom: fabBottom, backgroundColor: config.color }]}
        activeOpacity={0.85}
      >
        <Ionicons
          name={open ? 'close' : 'sparkles'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PANEL_WIDTH  = 340
const PANEL_HEIGHT = 480

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 98,
  },

  panel: {
    position:        'absolute',
    right:           16,
    width:           PANEL_WIDTH,
    maxHeight:       PANEL_HEIGHT,
    backgroundColor: '#fff',
    borderRadius:    20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.18,
    shadowRadius:    24,
    elevation:       12,
    zIndex:          99,
    overflow:        'hidden',
  },

  panelHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap: 10,
  },
  panelHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerBtn:     { padding: 4, marginLeft: 4 },

  messageList:        { flex: 1 },
  messageListContent: { padding: 12, paddingBottom: 4 },

  bubbleRow:     { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  bubbleRowAI:   {},

  avatar: {
    width:         24,
    height:        24,
    borderRadius:  12,
    alignItems:    'center',
    justifyContent:'center',
    marginHorizontal: 6,
    marginBottom:  2,
  },

  bubble: {
    maxWidth:     '78%',
    paddingHorizontal: 12,
    paddingVertical:    8,
    borderRadius:  16,
  },
  bubbleUser:     { borderBottomRightRadius: 4 },
  bubbleAI:       { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 13, lineHeight: 19 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAI:   { color: '#1e293b' },

  typingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  8,
    paddingLeft:   4,
  },
  typingBubble: {
    backgroundColor: '#f1f5f9',
    borderRadius:    14,
    paddingHorizontal: 16,
    paddingVertical:    10,
    marginLeft: 6,
  },

  errorRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   8,
    paddingHorizontal: 12,
  },
  errorText: { color: '#e43418', fontSize: 12, flex: 1 },

  quickPrompts: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             6,
    paddingHorizontal: 12,
    paddingBottom:   8,
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:    5,
  },
  quickChipText: { fontSize: 11, color: '#475569', fontWeight: '500' },

  inputRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: 12,
    paddingTop:        4,
    gap:               8,
    borderTopWidth:    1,
    borderTopColor:    '#f1f5f9',
  },
  input: {
    flex:              1,
    backgroundColor:   '#f8fafc',
    borderRadius:      12,
    paddingHorizontal: 12,
    paddingVertical:    8,
    fontSize:          13,
    color:             '#1e293b',
    maxHeight:         80,
    borderWidth:       1,
    borderColor:       '#e2e8f0',
  },
  sendBtn: {
    width:         36,
    height:        36,
    borderRadius:  18,
    alignItems:    'center',
    justifyContent:'center',
    marginBottom:   2,
  },

  disclaimer: {
    textAlign:   'center',
    fontSize:    10,
    color:       '#94a3b8',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  fab: {
    position:      'absolute',
    right:         20,
    width:         54,
    height:        54,
    borderRadius:  27,
    alignItems:    'center',
    justifyContent:'center',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  12,
    elevation:     8,
    zIndex:        100,
  },
})
