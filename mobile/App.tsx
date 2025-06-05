import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Button, TextInput, ScrollView, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Pdf from 'react-native-pdf';
import notionService from './services/notionService';
import { NotionConfig } from './types';

export default function App() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [identifierColumn, setIdentifierColumn] = useState('');
  const [textColumn, setTextColumn] = useState('');
  const [status, setStatus] = useState('');

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.type === 'success') {
      setPdfUri(result.uri);
    }
  };

  const sendToNotion = async () => {
    const config: NotionConfig = {
      databaseId,
      identifierColumn,
      textColumn,
      annotationColumn: '',
      pageColumn: '',
      identifierPattern: '',
      annotation: '',
      pageNumber: '',
      documentIdInsertionColumn: '',
      enableDocumentIdInsertion: false
    };

    try {
      const res = await notionService.saveTextWithIdentifier(config, selectedText);
      if (res.success) {
        setStatus('Saved with ID: ' + res.identifier);
      } else {
        setStatus('Failed to save text');
      }
    } catch (err: any) {
      setStatus('Error: ' + err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Pick PDF" onPress={pickPdf} />
      {pdfUri && (
        <View style={styles.viewer}>
          <Pdf source={{ uri: pdfUri }} style={{ flex: 1 }} />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.form}>
        <TextInput
          placeholder="Selected text"
          multiline
          value={selectedText}
          onChangeText={setSelectedText}
          style={styles.input}
        />
        <TextInput
          placeholder="Database ID"
          value={databaseId}
          onChangeText={setDatabaseId}
          style={styles.input}
        />
        <TextInput
          placeholder="Identifier column"
          value={identifierColumn}
          onChangeText={setIdentifierColumn}
          style={styles.input}
        />
        <TextInput
          placeholder="Text column"
          value={textColumn}
          onChangeText={setTextColumn}
          style={styles.input}
        />
        <Button title="Send to Notion" onPress={sendToNotion} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  viewer: { flex: 1, marginTop: 10 },
  form: { padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 10 },
  status: { marginTop: 10 }
});
