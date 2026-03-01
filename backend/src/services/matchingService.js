export const calculateEligibilityScore = (youthProfile, internshipRequirements) => {
  let skillMatch = 0;
  let educationMatch = 0;
  let locationMatch = 0;
  let priorityBoost = 0;

  // 1. Skill Match (40% weight)
  if (internshipRequirements.skills && internshipRequirements.skills.length > 0) {
    const requiredSkills = internshipRequirements.skills.map(s => s.toLowerCase());
    const youthSkills = youthProfile.skills?.map(s => s.toLowerCase()) || [];
    
    if (youthSkills.length > 0) {
      const matchedSkills = requiredSkills.filter(skill => 
        youthSkills.some(youthSkill => 
          youthSkill.includes(skill) || skill.includes(youthSkill)
        )
      );
      skillMatch = (matchedSkills.length / requiredSkills.length) * 40;
    }
  } else {
    // If no skills required, give full marks
    skillMatch = 40;
  }

  // 2. Education Match (30% weight)
  if (internshipRequirements.education?.level) {
    const reqLevel = internshipRequirements.education.level.toLowerCase();
    const youthLevel = youthProfile.education?.level?.toLowerCase() || '';
    
    // Simple education level matching
    const educationLevels = ['high school', 'diploma', 'bachelor', 'master', 'phd'];
    const reqLevelIndex = educationLevels.findIndex(level => reqLevel.includes(level));
    const youthLevelIndex = educationLevels.findIndex(level => youthLevel.includes(level));
    
    if (youthLevelIndex >= reqLevelIndex) {
      educationMatch = 30;
    } else if (youthLevelIndex === reqLevelIndex - 1) {
      educationMatch = 20;
    } else if (youthLevelIndex === reqLevelIndex - 2) {
      educationMatch = 10;
    }
  } else {
    educationMatch = 30; // Full marks if no education requirement
  }

  // 3. Location Match (20% weight)
  if (internshipRequirements.location) {
    const youthLocation = youthProfile.location || {};
    
    // Check district match (10%)
    if (internshipRequirements.location.district && 
        youthLocation.district?.toLowerCase() === internshipRequirements.location.district.toLowerCase()) {
      locationMatch += 10;
    }
    
    // Check state match (5%)
    if (internshipRequirements.location.state && 
        youthLocation.state?.toLowerCase() === internshipRequirements.location.state.toLowerCase()) {
      locationMatch += 5;
    }
    
    // Add remaining if no strict location preference
    if (locationMatch === 0) {
      locationMatch = 5; // Base location points
    }
  } else {
    locationMatch = 20; // Full marks if no location requirement
  }

  // 4. Priority Boost (10% - Rural/Income criteria)
  if (youthProfile.location?.isRural) {
    priorityBoost += 5; // Rural boost
  }
  
  if (youthProfile.incomeCriteria?.meetsCriteria) {
    priorityBoost += 5; // Income criteria boost
  }

  // Calculate total score (cap at 100)
  const totalScore = Math.min(
    Math.round(skillMatch + educationMatch + locationMatch + priorityBoost), 
    100
  );

  return {
    total: totalScore,
    breakdown: {
      skillMatch: Math.round(skillMatch),
      educationMatch: Math.round(educationMatch),
      locationMatch: Math.round(locationMatch),
      priorityBoost: Math.round(priorityBoost),
    }
  };
};