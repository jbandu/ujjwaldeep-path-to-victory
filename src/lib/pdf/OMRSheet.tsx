import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    borderBottom: 2,
    borderBottomColor: '#000000',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  testInfo: {
    fontSize: 10,
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  studentInfo: {
    marginBottom: 20,
    padding: 15,
    border: 1,
    borderColor: '#000000',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 80,
  },
  infoField: {
    fontSize: 10,
    flex: 1,
    borderBottom: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
  },
  instructions: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f7fafc',
    border: 1,
    borderColor: '#e2e8f0',
  },
  instructionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 8,
    lineHeight: 1.3,
  },
  answerGrid: {
    flex: 1,
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: '#edf2f7',
    padding: 5,
    border: 1,
    borderColor: '#000000',
  },
  questionCol: {
    width: 40,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  optionCol: {
    width: 35,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  gridRow: {
    flexDirection: 'row',
    borderLeft: 1,
    borderRight: 1,
    borderBottom: 1,
    borderColor: '#000000',
    minHeight: 25,
    alignItems: 'center',
  },
  questionCell: {
    width: 40,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
    borderRight: 1,
    borderColor: '#000000',
    paddingVertical: 5,
  },
  optionCell: {
    width: 35,
    textAlign: 'center',
    borderRight: 1,
    borderColor: '#000000',
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 12,
    height: 12,
    borderRadius: 6,
    border: 1.5,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666666',
    borderTop: 1,
    borderTopColor: '#cccccc',
    paddingTop: 10,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCode: {
    width: 50,
    height: 50,
  },
  alignmentCorner: {
    position: 'absolute',
    width: 15,
    height: 15,
    backgroundColor: '#000000',
  },
  topLeft: {
    top: 10,
    left: 10,
  },
  topRight: {
    top: 10,
    right: 10,
  },
  bottomLeft: {
    bottom: 10,
    left: 10,
  },
  bottomRight: {
    bottom: 10,
    right: 10,
  },
});

interface OMRSheetProps {
  testId: string;
  version: number;
  totalQuestions: number;
  qrCodeDataUrl: string;
  pageNumber?: number;
  questionsPerPage?: number;
}

const OMRSheet: React.FC<OMRSheetProps> = ({
  testId,
  version,
  totalQuestions,
  qrCodeDataUrl,
  pageNumber = 1,
  questionsPerPage = 50,
}) => {
  const startQuestion = (pageNumber - 1) * questionsPerPage + 1;
  const endQuestion = Math.min(pageNumber * questionsPerPage, totalQuestions);
  const questionsOnPage = endQuestion - startQuestion + 1;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Alignment corners */}
        <View style={[styles.alignmentCorner, styles.topLeft]} />
        <View style={[styles.alignmentCorner, styles.topRight]} />
        <View style={[styles.alignmentCorner, styles.bottomLeft]} />
        <View style={[styles.alignmentCorner, styles.bottomRight]} />

        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>UjjwalDeep</Text>
            <Text style={[styles.testInfo, { fontSize: 8 }]}>OMR Answer Sheet</Text>
          </View>
          <View style={styles.qrContainer}>
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
            <Text style={styles.testInfo}>Test ID: {testId.slice(-8)}</Text>
            <Text style={styles.testInfo}>Version: {version}</Text>
            <Text style={styles.testInfo}>Page: {pageNumber}</Text>
          </View>
        </View>

        <Text style={styles.title}>
          OMR ANSWER SHEET - NEET PRACTICE TEST
        </Text>

        <View style={styles.studentInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoField}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Roll No:</Text>
            <Text style={[styles.infoField, { width: 150 }]}></Text>
            <Text style={[styles.infoLabel, { marginLeft: 20 }]}>Date:</Text>
            <Text style={[styles.infoField, { width: 100 }]}></Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Signature:</Text>
            <Text style={[styles.infoField, { width: 200 }]}></Text>
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>INSTRUCTIONS FOR FILLING OMR SHEET:</Text>
          <Text style={styles.instructionText}>
            • Use only BLACK or BLUE ball point pen to fill the bubbles{'\n'}
            • Fill the bubbles completely and darkly (●) - not (○) or (✓){'\n'}
            • Do not make any stray marks on the OMR sheet{'\n'}
            • If you want to change an answer, erase completely and then fill the new bubble{'\n'}
            • Any incomplete or light filling may not be detected by the scanner
          </Text>
        </View>

        <View style={styles.answerGrid}>
          <View style={styles.gridHeader}>
            <Text style={styles.questionCol}>Q. No.</Text>
            <Text style={styles.optionCol}>A</Text>
            <Text style={styles.optionCol}>B</Text>
            <Text style={styles.optionCol}>C</Text>
            <Text style={styles.optionCol}>D</Text>
          </View>

          {Array.from({ length: questionsOnPage }, (_, index) => {
            const questionNumber = startQuestion + index;
            return (
              <View key={questionNumber} style={styles.gridRow}>
                <Text style={styles.questionCell}>{questionNumber}</Text>
                {['A', 'B', 'C', 'D'].map((option) => (
                  <View key={option} style={styles.optionCell}>
                    <View style={styles.bubble} />
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text>© UjjwalDeep - NEET Practice Platform</Text>
          <Text>Questions {startQuestion} to {endQuestion} of {totalQuestions}</Text>
          <Text>Page {pageNumber}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default OMRSheet;