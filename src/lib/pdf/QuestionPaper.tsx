import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Question } from '@/types/questions';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#f7fafc',
    padding: 8,
    textAlign: 'center',
  },
  questionContainer: {
    marginBottom: 15,
    paddingLeft: 10,
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 30,
  },
  questionStem: {
    fontSize: 11,
    flex: 1,
    lineHeight: 1.4,
  },
  optionsContainer: {
    marginLeft: 30,
    marginTop: 5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  optionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 20,
  },
  optionText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 1.3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
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
});

interface QuestionPaperProps {
  testId: string;
  version: number;
  questions: Question[];
  qrCodeDataUrl: string;
  duration: number;
}

const QuestionPaper: React.FC<QuestionPaperProps> = ({
  testId,
  version,
  questions,
  qrCodeDataUrl,
  duration,
}) => {
  // Group questions by subject for NEET format
  const groupedQuestions = questions.reduce((acc, question, index) => {
    const subject = question.subject;
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push({ ...question, number: index + 1 });
    return acc;
  }, {} as Record<string, (Question & { number: number })[]>);

  const subjectOrder = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
  const orderedSubjects = subjectOrder.filter(subject => groupedQuestions[subject]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>UjjwalDeep</Text>
            <Text style={[styles.testInfo, { fontSize: 8 }]}>NEET Practice Test</Text>
          </View>
          <View style={styles.qrContainer}>
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
            <Text style={styles.testInfo}>Test ID: {testId.slice(-8)}</Text>
            <Text style={styles.testInfo}>Version: {version}</Text>
          </View>
        </View>

        <Text style={styles.title}>
          NATIONAL ELIGIBILITY CUM ENTRANCE TEST (NEET) - PRACTICE PAPER
        </Text>

        <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#fffbf0', border: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>Instructions:</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.3 }}>
            • Time Allowed: {Math.floor(duration / 60)} minutes{'\n'}
            • Total Questions: {questions.length}{'\n'}
            • Each question carries 4 marks for correct answer, -1 mark for incorrect answer{'\n'}
            • Fill the OMR sheet carefully with dark pencil or pen{'\n'}
            • Do not make any stray marks on the OMR sheet
          </Text>
        </View>

        {orderedSubjects.map((subject) => (
          <View key={subject}>
            <Text style={styles.sectionHeader}>
              SECTION: {subject.toUpperCase()}
            </Text>
            
            {groupedQuestions[subject].map((question) => (
              <View key={question.number} style={styles.questionContainer}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>{question.number}.</Text>
                  <Text style={styles.questionStem}>{question.stem}</Text>
                </View>
                
                <View style={styles.optionsContainer}>
                  {question.options.map((option, index) => (
                    <View key={index} style={styles.option}>
                      <Text style={styles.optionLabel}>
                        ({String.fromCharCode(65 + index)})
                      </Text>
                      <Text style={styles.optionText}>{option}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text>© UjjwalDeep - NEET Practice Platform</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuestionPaper;