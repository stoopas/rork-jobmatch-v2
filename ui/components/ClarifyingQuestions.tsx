import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { CheckCircle, Circle, HelpCircle, MessageSquare, X } from 'lucide-react-native';
import { useUserProfile } from '../../contexts/UserProfileContext';

export interface ClarifyingQuestion {
  id: string;
  text: string;
  topic: string;
  category: 'skill' | 'tool' | 'domain' | 'experience';
  topicKey: string;
  requiresProficiency?: boolean;
}

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  onComplete: () => void;
  jobId: string;
}

type Answer = 'yes' | 'no' | 'not_sure';

export default function ClarifyingQuestions({
  questions,
  onComplete,
  jobId,
}: ClarifyingQuestionsProps) {
  const { addOrUpdateSkill, addOrUpdateTool, recordClarifyingAnswer } = useUserProfile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [proficiency, setProficiency] = useState<number | null>(null);
  const [isCustomResponse, setIsCustomResponse] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  const handleAnswerSelect = (selectedAnswer: Answer) => {
    setAnswer(selectedAnswer);
    if (selectedAnswer === 'no') {
      setProficiency(null);
    }
  };

  const handleProficiencySelect = (level: number) => {
    setProficiency(level);
  };

  const handleNext = useCallback(async () => {
    if (!currentQuestion) return;

    if (!answer && !customText.trim()) {
      Alert.alert('Response Required', 'Please select an option or provide a custom response');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalAnswer = customText.trim() || answer || 'not_sure';
      const finalProficiency = proficiency || undefined;

      recordClarifyingAnswer(currentQuestion.topicKey, {
        question: currentQuestion.text,
        answer: finalAnswer,
        category: currentQuestion.category,
        topic: currentQuestion.topic,
        proficiencyLevel: finalProficiency,
        confirmed: answer === 'yes',
      });

      if (answer === 'yes' && currentQuestion.category === 'skill') {
        addOrUpdateSkill({
          name: currentQuestion.topic,
          category: 'Technical',
          proficiency: finalProficiency,
          source: 'chat_clarification',
          confirmedAt: new Date().toISOString(),
        });
      }

      if (answer === 'yes' && currentQuestion.category === 'tool') {
        addOrUpdateTool({
          name: currentQuestion.topic,
          category: 'Software',
          proficiency: finalProficiency,
          source: 'chat_clarification',
          confirmedAt: new Date().toISOString(),
        });
      }

      setAnswer(null);
      setProficiency(null);
      setCustomText('');
      setIsCustomResponse(false);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to save your answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentQuestion,
    answer,
    customText,
    proficiency,
    currentIndex,
    questions.length,
    recordClarifyingAnswer,
    addOrUpdateSkill,
    addOrUpdateTool,
    onComplete,
  ]);

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswer(null);
      setProficiency(null);
      setCustomText('');
      setIsCustomResponse(false);
    } else {
      onComplete();
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
      </View>

      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <HelpCircle size={24} color="#0066FF" />
          <Text style={styles.questionNumber}>Quick Question</Text>
        </View>
        <Text style={styles.questionText}>{currentQuestion.text}</Text>

        {!isCustomResponse ? (
          <>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  answer === 'yes' && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerSelect('yes')}
                disabled={isSubmitting}
              >
                {answer === 'yes' ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <Circle size={20} color="#666666" />
                )}
                <Text
                  style={[
                    styles.optionText,
                    answer === 'yes' && styles.optionTextSelected,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  answer === 'no' && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerSelect('no')}
                disabled={isSubmitting}
              >
                {answer === 'no' ? (
                  <CheckCircle size={20} color="#EF4444" />
                ) : (
                  <Circle size={20} color="#666666" />
                )}
                <Text
                  style={[
                    styles.optionText,
                    answer === 'no' && styles.optionTextSelected,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  answer === 'not_sure' && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerSelect('not_sure')}
                disabled={isSubmitting}
              >
                {answer === 'not_sure' ? (
                  <CheckCircle size={20} color="#F59E0B" />
                ) : (
                  <Circle size={20} color="#666666" />
                )}
                <Text
                  style={[
                    styles.optionText,
                    answer === 'not_sure' && styles.optionTextSelected,
                  ]}
                >
                  Not Sure
                </Text>
              </TouchableOpacity>
            </View>

            {answer === 'yes' && currentQuestion.requiresProficiency && (
              <View style={styles.proficiencyContainer}>
                <Text style={styles.proficiencyLabel}>
                  How would you rate your proficiency?
                </Text>
                <View style={styles.proficiencyButtons}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.proficiencyButton,
                        proficiency === level && styles.proficiencyButtonSelected,
                      ]}
                      onPress={() => handleProficiencySelect(level)}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          styles.proficiencyButtonText,
                          proficiency === level &&
                            styles.proficiencyButtonTextSelected,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.proficiencyLabels}>
                  <Text style={styles.proficiencyLabelText}>Basic</Text>
                  <Text style={styles.proficiencyLabelText}>Expert</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.customButton}
              onPress={() => setIsCustomResponse(true)}
              disabled={isSubmitting}
            >
              <MessageSquare size={16} color="#0066FF" />
              <Text style={styles.customButtonText}>Custom response</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.customResponseContainer}>
            <View style={styles.customHeader}>
              <Text style={styles.customHeaderText}>Custom Response</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomResponse(false);
                  setCustomText('');
                }}
                disabled={isSubmitting}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.customInput}
              placeholder="Type your response here..."
              value={customText}
              onChangeText={setCustomText}
              multiline
              placeholderTextColor="#999999"
              editable={!isSubmitting}
            />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isSubmitting}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            (!answer && !customText.trim()) && styles.nextButtonDisabled,
            isSubmitting && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={(!answer && !customText.trim()) || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentIndex < questions.length - 1 ? 'Next' : 'Complete'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066FF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500' as const,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0066FF',
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: '#0066FF',
    backgroundColor: '#EBF3FF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#666666',
  },
  optionTextSelected: {
    color: '#1A1A1A',
    fontWeight: '600' as const,
  },
  proficiencyContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  proficiencyLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  proficiencyButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  proficiencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  proficiencyButtonSelected: {
    borderColor: '#0066FF',
    backgroundColor: '#0066FF',
  },
  proficiencyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666666',
  },
  proficiencyButtonTextSelected: {
    color: '#FFFFFF',
  },
  proficiencyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  proficiencyLabelText: {
    fontSize: 12,
    color: '#666666',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066FF',
    backgroundColor: '#FFFFFF',
  },
  customButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#0066FF',
  },
  customResponseContainer: {
    marginBottom: 20,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customHeaderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  customInput: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#1A1A1A',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666666',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0066FF',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
